import "dotenv/config"
import cors from "cors"
import express from "express"
import { PrismaClient } from "@prisma/client"
import multer from "multer"
import {
  analyzeFromParsed,
  parseExtraction,
  type NutritionParsed,
  type OCRExtraction,
  type ParsedData
} from "@wimf/shared"
import { z } from "zod"
import { createWorker } from "tesseract.js"
import rateLimit from "express-rate-limit"
import OpenAI from "openai"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import crypto from "crypto"

class OcrError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "OcrError"
  }
}

const app = express()
const prisma = new PrismaClient()
let dbAvailable = true
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 }
})

const port = Number(process.env.PORT || 4000)
const openAiKey = process.env.OPENAI_API_KEY
const openAiModel = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini"
const openai = openAiKey ? new OpenAI({ apiKey: openAiKey }) : null
const jwtSecret = process.env.JWT_SECRET || "change-me"
const corsOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(express.json({ limit: "1mb" }))
app.use(express.urlencoded({ extended: true, limit: "1mb" }))
app.use(
  cors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: true
  })
)

const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 12,
  standardHeaders: true,
  legacyHeaders: false
})

type AuthPayload = {
  userId: string
}

const signToken = (userId: string) =>
  jwt.sign({ userId } satisfies AuthPayload, jwtSecret, { expiresIn: "7d" })

const requireAuth: express.RequestHandler = (req, res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" })
  }
  const token = header.slice("Bearer ".length)
  try {
    const payload = jwt.verify(token, jwtSecret) as AuthPayload
    ;(req as { userId?: string }).userId = payload.userId
    return next()
  } catch {
    return res.status(401).json({ error: "Invalid token" })
  }
}

const getAuthUserId = (req: express.Request) => (req as { userId?: string }).userId

const getOptionalUserId = (req: express.Request) => {
  const header = req.headers.authorization
  if (header?.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length)
    try {
      const payload = jwt.verify(token, jwtSecret) as AuthPayload
      return payload.userId
    } catch {
      return null
    }
  }
  const bodyUserId = (req.body as { userId?: string })?.userId
  return bodyUserId || null
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" })
})

const signUpSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8)
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

const forgotPasswordSchema = z.object({
  email: z.string().email()
})

const resetPasswordSchema = z.object({
  email: z.string().email(),
  token: z.string().min(6),
  newPassword: z.string().min(8)
})

const profileSchema = z.object({
  fullName: z.string().min(1).optional(),
  mobileNumber: z.string().min(3).optional(),
  age: z.number().int().min(1).max(120).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  race: z.string().optional(),
  dietaryPreference: z.enum(["halal", "vegetarian", "vegan", "none"]).optional(),
  heightCm: z.number().min(50).max(250).optional(),
  weightKg: z.number().min(20).max(250).optional(),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active"]).optional()
})

const conditionsSchema = z.object({
  conditions: z.array(
    z.object({
      type: z.enum([
        "diabetes",
        "hypertension",
        "heart_disease",
        "high_cholesterol",
        "celiac",
        "allergy",
        "kidney_disease",
        "other"
      ]),
      notes: z.string().optional().nullable()
    })
  )
})

app.post("/auth/signup", async (req, res, next) => {
  try {
    const payload = signUpSchema.parse(req.body)
    const existing = await prisma.user.findUnique({ where: { email: payload.email } })
    if (existing) {
      return res.status(409).json({ error: "Email already in use" })
    }

    const passwordHash = await bcrypt.hash(payload.password, 10)
    const user = await prisma.user.create({
      data: {
        fullName: payload.fullName,
        email: payload.email,
        passwordHash,
        dailyCalorieGoal: 2000
      }
    })

    const token = signToken(user.id)
    return res.json({
      token,
      profile: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        age: user.age,
        gender: user.gender,
        race: user.race,
        dietaryPreference: user.dietaryPreference,
        heightCm: user.heightCm,
        weightKg: user.weightKg,
        activityLevel: user.activityLevel,
        dailyCalorieGoal: user.dailyCalorieGoal
      }
    })
  } catch (error) {
    return next(error)
  }
})

app.post("/auth/login", async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body)
    const user = await prisma.user.findUnique({ where: { email: payload.email } })
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" })
    }
    const valid = await bcrypt.compare(payload.password, user.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" })
    }
    const token = signToken(user.id)
    return res.json({
      token,
      profile: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        age: user.age,
        gender: user.gender,
        race: user.race,
        dietaryPreference: user.dietaryPreference,
        heightCm: user.heightCm,
        weightKg: user.weightKg,
        activityLevel: user.activityLevel,
        dailyCalorieGoal: user.dailyCalorieGoal
      }
    })
  } catch (error) {
    return next(error)
  }
})

app.post("/auth/forgot-password", async (req, res, next) => {
  try {
    const payload = forgotPasswordSchema.parse(req.body)
    const user = await prisma.user.findUnique({ where: { email: payload.email } })
    if (!user) {
      return res.json({ message: "If the email exists, a reset token was generated." })
    }

    const token = crypto.randomBytes(16).toString("hex")
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
    const expires = new Date(Date.now() + 1000 * 60 * 30)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetTokenHash: tokenHash,
        resetTokenExpires: expires
      }
    })

    return res.json({
      message: "Reset token generated.",
      token
    })
  } catch (error) {
    return next(error)
  }
})

app.post("/auth/reset-password", async (req, res, next) => {
  try {
    const payload = resetPasswordSchema.parse(req.body)
    const user = await prisma.user.findUnique({ where: { email: payload.email } })
    if (!user || !user.resetTokenHash || !user.resetTokenExpires) {
      return res.status(400).json({ error: "Invalid reset token." })
    }
    if (user.resetTokenExpires.getTime() < Date.now()) {
      return res.status(400).json({ error: "Reset token expired." })
    }

    const tokenHash = crypto.createHash("sha256").update(payload.token).digest("hex")
    if (tokenHash !== user.resetTokenHash) {
      return res.status(400).json({ error: "Invalid reset token." })
    }

    const passwordHash = await bcrypt.hash(payload.newPassword, 10)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetTokenHash: null,
        resetTokenExpires: null
      }
    })

    return res.json({ message: "Password updated." })
  } catch (error) {
    return next(error)
  }
})

app.get("/profile", requireAuth, async (req, res, next) => {
  try {
    const userId = getAuthUserId(req)
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return res.status(404).json({ error: "Profile not found" })
    return res.json({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      mobileNumber: user.mobileNumber,
      age: user.age,
      gender: user.gender,
      race: user.race,
      dietaryPreference: user.dietaryPreference,
      heightCm: user.heightCm,
      weightKg: user.weightKg,
      activityLevel: user.activityLevel,
      dailyCalorieGoal: user.dailyCalorieGoal
    })
  } catch (error) {
    return next(error)
  }
})

app.put("/profile", requireAuth, async (req, res, next) => {
  try {
    const payload = profileSchema.parse(req.body)
    const userId = getAuthUserId(req)
    const existing = await prisma.user.findUnique({ where: { id: userId } })
    const goal = calculateDailyCalorieGoal({
      age: payload.age ?? existing?.age ?? null,
      gender: payload.gender ?? existing?.gender ?? null,
      heightCm: payload.heightCm ?? existing?.heightCm ?? null,
      weightKg: payload.weightKg ?? existing?.weightKg ?? null,
      activityLevel: payload.activityLevel ?? existing?.activityLevel ?? null
    })
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...payload,
        dailyCalorieGoal: goal
      }
    })
    return res.json({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      mobileNumber: user.mobileNumber,
      age: user.age,
      gender: user.gender,
      race: user.race,
      dietaryPreference: user.dietaryPreference,
      heightCm: user.heightCm,
      weightKg: user.weightKg,
      activityLevel: user.activityLevel,
      dailyCalorieGoal: user.dailyCalorieGoal
    })
  } catch (error) {
    return next(error)
  }
})

app.get("/conditions", requireAuth, async (req, res, next) => {
  try {
    const userId = getAuthUserId(req)
    const conditions = await prisma.medicalCondition.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" }
    })
    return res.json(
      conditions.map((condition) => ({
        id: condition.id,
        type: condition.type,
        notes: condition.notes
      }))
    )
  } catch (error) {
    return next(error)
  }
})

app.put("/conditions", requireAuth, async (req, res, next) => {
  try {
    const payload = conditionsSchema.parse(req.body)
    const userId = getAuthUserId(req)!

    await prisma.medicalCondition.deleteMany({ where: { userId } })
    const created = await prisma.$transaction(
      payload.conditions.map((condition) =>
        prisma.medicalCondition.create({
          data: {
            userId,
            type: condition.type,
            notes: condition.notes || null
          }
        })
      )
    )

    return res.json(
      created.map((condition) => ({
        id: condition.id,
        type: condition.type,
        notes: condition.notes
      }))
    )
  } catch (error) {
    return next(error)
  }
})

app.get("/calories/today", requireAuth, async (req, res, next) => {
  try {
    const userId = getAuthUserId(req)
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)

    const [user, logs] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.calorieLog.findMany({
        where: { userId, logDate: { gte: start, lte: end } }
      })
    ])

    const consumed = logs.reduce((sum, entry) => sum + entry.calories, 0)
    const goal = user?.dailyCalorieGoal || 2000
    const remaining = Math.max(0, goal - consumed)
    const status = remaining === 0 ? "reached" : "within"

    return res.json({ goal, consumed, remaining, status })
  } catch (error) {
    return next(error)
  }
})

const caloriesConsumeSchema = z.object({
  calories: z.number().positive(),
  source: z.string().optional()
})

app.post("/calories/consume", requireAuth, async (req, res, next) => {
  try {
    const payload = caloriesConsumeSchema.parse(req.body)
    const userId = getAuthUserId(req)!
    const logDate = new Date()
    logDate.setHours(0, 0, 0, 0)

    await prisma.calorieLog.create({
      data: {
        userId,
        logDate,
        calories: payload.calories
      }
    })

    const summary = await prisma.calorieLog.aggregate({
      where: { userId, logDate: { gte: logDate } },
      _sum: { calories: true }
    })
    const user = await prisma.user.findUnique({ where: { id: userId } })
    const consumed = summary._sum.calories || 0
    const goal = user?.dailyCalorieGoal || 2000
    const remaining = Math.max(0, goal - consumed)
    const status = remaining === 0 ? "reached" : "within"

    return res.json({ goal, consumed, remaining, status })
  } catch (error) {
    return next(error)
  }
})

const runOcr = async (buffer: Buffer) => {
  const worker = await createWorker("eng")
  try {
    const {
      data: { text, confidence }
    } = await worker.recognize(buffer)

    return {
      text: text || "",
      confidence: typeof confidence === "number" ? confidence / 100 : 0
    }
  } catch (error) {
    console.error("OCR failure", error)
    throw new OcrError("OCR failed to read one or more images.")
  } finally {
    await worker.terminate()
  }
}

const truncateText = (value: string, maxLength = 2000) =>
  value.length > maxLength ? `${value.slice(0, maxLength)}...` : value

const sanitizeExtracted = (payload?: {
  ingredientsText?: string
  nutritionText?: string
  frontText?: string
}) => {
  if (!payload) return undefined
  return {
    ...payload,
    ingredientsText: payload.ingredientsText
      ? truncateText(payload.ingredientsText)
      : undefined,
    nutritionText: payload.nutritionText ? truncateText(payload.nutritionText) : undefined,
    frontText: payload.frontText ? truncateText(payload.frontText) : undefined
  }
}

const extractImagesSchema = z.object({
  ingredientsImage: z.any().optional(),
  nutritionImage: z.any().optional(),
  frontImage: z.any().optional()
})

const IMAGE_CONFIDENCE_MIN = 0.45

const isParsedEmpty = (parsed: ReturnType<typeof parseExtraction>) =>
  !parsed.productName && parsed.ingredients.length === 0 && !parsed.nutrition

const withDb = async <T>(action: () => Promise<T>, context: string): Promise<T | null> => {
  if (!dbAvailable) return null
  try {
    return await action()
  } catch (error) {
    dbAvailable = false
    console.warn(`DB unavailable, skipping ${context}.`, error)
    return null
  }
}

const visionSchema = z.object({
  productName: z.string().nullable().optional(),
  ingredients: z.array(z.string()).optional(),
  nutrition: z
    .object({
      calories: z.number().nullable().optional(),
      servingSizeG: z.number().nullable().optional(),
      caloriesPer100g: z.number().nullable().optional(),
      protein_g: z.number().nullable().optional(),
      carbs_g: z.number().nullable().optional(),
      sugar_g: z.number().nullable().optional(),
      sodium_mg: z.number().nullable().optional()
    })
    .nullable()
    .optional(),
  confidence: z.number().min(0).max(1).optional(),
  notes: z.string().optional()
})

const toDataUrl = (buffer: Buffer, mimeType?: string) => {
  const safeType = mimeType && mimeType.includes("/") ? mimeType : "image/jpeg"
  return `data:${safeType};base64,${buffer.toString("base64")}`
}

const getResponseText = (response: any) => {
  if (typeof response?.output_text === "string") return response.output_text
  const content = response?.output?.[0]?.content
  if (Array.isArray(content)) {
    const textItem = content.find((item) => item.type === "output_text")
    if (textItem?.text) return textItem.text
  }
  return ""
}

const buildVisionParsed = (payload: z.infer<typeof visionSchema>): ParsedData => {
  const ingredients = (payload.ingredients || []).map((item) => item.trim()).filter(Boolean)
  const nutrition = payload.nutrition ?? null
  const inferredName = guessDishName(payload.productName ?? null, ingredients)
  const confidence = typeof payload.confidence === "number" ? payload.confidence : 0.4
  const ingredientConfidence = ingredients.length ? Math.min(0.9, confidence) : 0.2
  const nutritionFields = nutrition
    ? Object.values(nutrition).filter((value) => value !== null && value !== undefined).length
    : 0
  const nutritionConfidence = nutritionFields
    ? Math.min(0.9, confidence * Math.min(1, nutritionFields / 6))
    : 0.2
  const nameConfidence = inferredName ? Math.min(0.85, confidence) : 0.2

  return {
    productName: inferredName,
    ingredients,
    nutrition: nutritionFields ? (nutrition as NutritionParsed) : null,
    confidences: {
      ingredientsConfidence: ingredientConfidence,
      nutritionConfidence,
      nameConfidence
    }
  }
}

const guessDishName = (productName: string | null, ingredients: string[]) => {
  const cleanedName = productName?.trim() || ""
  const lowerName = cleanedName.toLowerCase()
  const genericNames = new Set([
    "sandwich",
    "likely sandwich",
    "burger",
    "likely burger",
    "meal",
    "dish",
    "food",
    "likely food"
  ])

  const lower = ingredients.map((item) => item.toLowerCase())
  const hasRice = lower.some((item) => item.includes("rice") || item.includes("basmati"))
  const hasChicken = lower.some((item) => item.includes("chicken"))
  const hasYogurt = lower.some((item) => item.includes("yogurt"))
  const hasSpice = lower.some((item) => item.includes("spice") || item.includes("cardamom"))
  const hasBread = lower.some((item) => item.includes("bread") || item.includes("bun"))
  const hasSesame = lower.some((item) => item.includes("sesame"))
  const hasSausage = lower.some((item) => item.includes("sausage") || item.includes("salami"))
  const hasPickle = lower.some((item) => item.includes("pickle") || item.includes("jalape"))
  const hasTomato = lower.some((item) => item.includes("tomato"))

  if (hasRice && hasChicken && (hasYogurt || hasSpice)) {
    return "Likely chicken biryani"
  }
  if (hasBread && (hasSausage || hasPickle || hasTomato)) {
    return hasSesame ? "Likely sesame sausage sandwich" : "Likely sausage sandwich"
  }
  if (hasBread && hasSesame) {
    return "Likely sesame bread sandwich"
  }
  if (cleanedName && !genericNames.has(lowerName)) {
    return cleanedName
  }
  if (hasRice && hasChicken) {
    return "Likely chicken and rice dish"
  }
  if (hasRice) {
    return "Likely rice-based dish"
  }
  if (hasChicken) {
    return "Likely chicken dish"
  }

  return null
}

const calculateDailyCalorieGoal = (input: {
  age?: number | null
  gender?: "male" | "female" | "other" | null
  heightCm?: number | null
  weightKg?: number | null
  activityLevel?: "sedentary" | "light" | "moderate" | "active" | null
}) => {
  const { age, gender, heightCm, weightKg, activityLevel } = input
  if (!age || !heightCm || !weightKg) return 2000

  const base =
    10 * weightKg +
    6.25 * heightCm -
    5 * age +
    (gender === "male" ? 5 : gender === "female" ? -161 : 0)

  const multiplier =
    activityLevel === "active"
      ? 1.725
      : activityLevel === "moderate"
        ? 1.55
        : activityLevel === "light"
          ? 1.375
          : 1.2

  return Math.round(base * multiplier)
}

const evaluateSuitability = (input: {
  ingredients: string[]
  nutrition: {
    sodium_mg?: number | null
    sugar_g?: number | null
    carbs_g?: number | null
  } | null
  halalStatus?: "halal" | "haram" | "unclear" | "unknown"
  dietaryPreference?: string | null
  conditions: Array<{ type: string; notes?: string | null }>
}) => {
  const reasons: string[] = []
  const lowerIngredients = input.ingredients.map((item) => item.toLowerCase())
  const sodium = input.nutrition?.sodium_mg ?? null
  const sugar = input.nutrition?.sugar_g ?? null
  const carbs = input.nutrition?.carbs_g ?? null

  if (input.dietaryPreference === "halal") {
    if (input.halalStatus === "haram") {
      reasons.push("Halal preference: ingredients indicate haram.")
    } else if (input.halalStatus === "unclear") {
      reasons.push("Halal preference: sourcing is unclear.")
    }
  }
  if (input.dietaryPreference === "vegetarian") {
    if (lowerIngredients.some((item) => ["chicken", "beef", "pork", "fish", "meat"].some((t) => item.includes(t)))) {
      reasons.push("Vegetarian preference: contains meat or fish.")
    }
  }
  if (input.dietaryPreference === "vegan") {
    if (lowerIngredients.some((item) =>
      ["chicken", "beef", "pork", "fish", "meat", "egg", "milk", "cheese", "butter", "yogurt"].some((t) =>
        item.includes(t)
      )
    )) {
      reasons.push("Vegan preference: contains animal-based ingredients.")
    }
  }

  for (const condition of input.conditions) {
    switch (condition.type) {
      case "diabetes":
        if ((sugar ?? 0) > 10 || (carbs ?? 0) > 30) {
          reasons.push("Diabetes: sugar/carbs are high.")
        }
        break
      case "hypertension":
        if ((sodium ?? 0) > 500) {
          reasons.push("Hypertension: sodium is high.")
        }
        break
      case "heart_disease":
        if ((sodium ?? 0) > 400) {
          reasons.push("Heart condition: sodium is high.")
        }
        break
      case "high_cholesterol":
        if (lowerIngredients.some((item) => ["sausage", "salami", "lard", "butter"].some((t) => item.includes(t)))) {
          reasons.push("High cholesterol: contains high-fat ingredients.")
        }
        break
      case "celiac":
        if (lowerIngredients.some((item) => ["wheat", "bread", "barley", "gluten"].some((t) => item.includes(t)))) {
          reasons.push("Celiac: likely contains gluten.")
        }
        break
      case "allergy":
        if (condition.notes) {
          const tokens = condition.notes
            .split(/[,;]/)
            .map((token) => token.trim().toLowerCase())
            .filter(Boolean)
          if (tokens.some((token) => lowerIngredients.some((item) => item.includes(token)))) {
            reasons.push("Allergy: ingredient matches your allergy list.")
          }
        }
        break
      default:
        break
    }
  }

  if (!reasons.length) {
    return { verdict: "good" as const, reasons: ["No major conflicts found."] }
  }

  return { verdict: "not_recommended" as const, reasons }
}

const runVisionEstimate = async (buffer: Buffer, mimeType?: string) => {
  if (!openai) {
    throw new OcrError("Vision AI is not configured. Upload a label or set OPENAI_API_KEY.")
  }

  const prompt = [
    "You are analyzing a food photo without a label.",
    "Return JSON only.",
    "Always provide a best-guess productName with a specific dish name (e.g., crispy chicken burger).",
    "Prefix with 'Likely' if uncertain.",
    "If you cannot infer a field, return null.",
    "For ingredients, list the most likely ingredients in plain English.",
    "For nutrition, estimate per 100g if possible (calories, protein_g, carbs_g, sugar_g, sodium_mg).",
    "Include a confidence value from 0 to 1."
  ].join(" ")

  const response = await openai.responses.create({
    model: openAiModel,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          {
            type: "input_image",
            image_url: toDataUrl(buffer, mimeType),
            detail: "low"
          }
        ]
      }
    ],
    max_output_tokens: 300,
    text: {
      format: { type: "json_object" }
    }
  })

  const responseText = getResponseText(response)
  if (!responseText) {
    throw new OcrError("Vision AI did not return usable data.")
  }

  const payload = visionSchema.parse(JSON.parse(responseText))
  return buildVisionParsed(payload)
}

const buildVisionExtraction = (parsed: ParsedData) =>
  ({
    ingredientsText: "AI Vision estimate (no label detected).",
    nutritionText: "AI Vision estimate (no label detected).",
    frontText: parsed.productName || "AI Vision estimate (no label detected)."
  } satisfies { ingredientsText: string; nutritionText: string; frontText: string })

app.post(
  "/extract",
  upload.fields([
    { name: "ingredientsImage", maxCount: 1 },
    { name: "nutritionImage", maxCount: 1 },
    { name: "frontImage", maxCount: 1 }
  ]),
  async (req, res, next) => {
    try {
      const files = extractImagesSchema.parse(req.files || {})
      const ingredientsFile = files.ingredientsImage?.[0]
      const nutritionFile = files.nutritionImage?.[0]
      const frontFile = files.frontImage?.[0]

      if (!ingredientsFile && !nutritionFile && !frontFile) {
        return res.status(400).json({ error: "At least one label image is required." })
      }

      let extracted = {
        ingredientsText: "",
        nutritionText: "",
        frontText: ""
      }
      let confidence = 0

      if (ingredientsFile || nutritionFile) {
        const [ingredientsOcr, nutritionOcr, frontOcr] = await Promise.all([
          ingredientsFile ? runOcr(ingredientsFile.buffer) : Promise.resolve({ text: "", confidence: 0 }),
          nutritionFile ? runOcr(nutritionFile.buffer) : Promise.resolve({ text: "", confidence: 0 }),
          frontFile ? runOcr(frontFile.buffer) : Promise.resolve(null)
        ])
        extracted = {
          ingredientsText: ingredientsOcr.text,
          nutritionText: nutritionOcr.text,
          frontText: frontOcr?.text || ""
        }
        confidence = Math.max(ingredientsOcr.confidence, nutritionOcr.confidence, frontOcr?.confidence || 0)
      } else if (frontFile) {
        const frontOcr = await runOcr(frontFile.buffer)
        extracted = {
          ingredientsText: frontOcr.text,
          nutritionText: frontOcr.text,
          frontText: frontOcr.text
        }
        confidence = frontOcr.confidence
      }

      let parsed = parseExtraction(extracted.ingredientsText, extracted.nutritionText, extracted.frontText)
      const needsVision =
        !!frontFile &&
        (confidence < IMAGE_CONFIDENCE_MIN || isParsedEmpty(parsed))

      if (needsVision) {
        parsed = await runVisionEstimate(frontFile.buffer, frontFile.mimetype)
        extracted = buildVisionExtraction(parsed)
      } else if (confidence < IMAGE_CONFIDENCE_MIN || isParsedEmpty(parsed)) {
        throw new OcrError("Image is not clear. Upload again.")
      }

      return res.json({
        extractedText: extracted,
        parsed,
        confidences: parsed.confidences
      })
    } catch (error) {
      return next(error)
    }
  }
)

app.post(
  "/analyze-from-images",
  analyzeLimiter,
  upload.fields([
    { name: "ingredientsImage", maxCount: 1 },
    { name: "nutritionImage", maxCount: 1 },
    { name: "frontImage", maxCount: 1 }
  ]),
  async (req, res, next) => {
    try {
      const files = extractImagesSchema.parse(req.files || {})
      const ingredientsFile = files.ingredientsImage?.[0]
      const nutritionFile = files.nutritionImage?.[0]
      const frontFile = files.frontImage?.[0]

      if (!ingredientsFile && !nutritionFile && !frontFile) {
        return res.status(400).json({ error: "At least one label image is required." })
      }

      let extracted = {
        ingredientsText: "",
        nutritionText: "",
        frontText: ""
      }
      let confidence = 0

      if (ingredientsFile || nutritionFile) {
        const [ingredientsOcr, nutritionOcr, frontOcr] = await Promise.all([
          ingredientsFile ? runOcr(ingredientsFile.buffer) : Promise.resolve({ text: "", confidence: 0 }),
          nutritionFile ? runOcr(nutritionFile.buffer) : Promise.resolve({ text: "", confidence: 0 }),
          frontFile ? runOcr(frontFile.buffer) : Promise.resolve(null)
        ])
        extracted = {
          ingredientsText: ingredientsOcr.text,
          nutritionText: nutritionOcr.text,
          frontText: frontOcr?.text || ""
        }
        confidence = Math.max(ingredientsOcr.confidence, nutritionOcr.confidence, frontOcr?.confidence || 0)
      } else if (frontFile) {
        const frontOcr = await runOcr(frontFile.buffer)
        extracted = {
          ingredientsText: frontOcr.text,
          nutritionText: frontOcr.text,
          frontText: frontOcr.text
        }
        confidence = frontOcr.confidence
      }

      let parsed = parseExtraction(extracted.ingredientsText, extracted.nutritionText, extracted.frontText)
      const needsVision =
        !!frontFile &&
        (confidence < IMAGE_CONFIDENCE_MIN || isParsedEmpty(parsed))

      if (needsVision) {
        parsed = await runVisionEstimate(frontFile.buffer, frontFile.mimetype)
        extracted = buildVisionExtraction(parsed)
      } else if (confidence < IMAGE_CONFIDENCE_MIN || isParsedEmpty(parsed)) {
        throw new OcrError("Image is not clear. Upload again.")
      }

      let userPrefs = undefined as any
      let dietaryPreference: string | null = null
      let conditions: Array<{ type: string; notes?: string | null }> = []
      const resolvedUserId = getOptionalUserId(req)

      if (req.body.userPrefs) {
        try {
          userPrefs = JSON.parse(req.body.userPrefs)
        } catch {
          return res.status(400).json({ error: "Invalid userPrefs JSON" })
        }
      } else if (resolvedUserId) {
        const prefs = await withDb(
          () => prisma.userPrefs.findUnique({ where: { userId: resolvedUserId } }),
          "prefs lookup"
        )
        if (prefs) userPrefs = prefs
      }

      if (resolvedUserId) {
        const [profile, medicalConditions] = await Promise.all([
          withDb(() => prisma.user.findUnique({ where: { id: resolvedUserId } }), "profile lookup"),
          withDb(
            () => prisma.medicalCondition.findMany({ where: { userId: resolvedUserId } }),
            "conditions lookup"
          )
        ])
        dietaryPreference = profile?.dietaryPreference || null
        conditions =
          medicalConditions?.map((condition) => ({
            type: condition.type,
            notes: condition.notes
          })) || []
      }

      const analysis = analyzeFromParsed(parsed, userPrefs ?? undefined, extracted)
      const suitability = evaluateSuitability({
        ingredients: parsed.ingredients,
        nutrition: parsed.nutrition,
        halalStatus: analysis.halal.status,
        dietaryPreference,
        conditions
      })

      return res.json({
        ...analysis,
        suitability,
        parsing: {
          extractedText: extracted,
          confidences: parsed.confidences
        }
      })
    } catch (error) {
      return next(error)
    }
  }
)

app.get("/history", async (req, res, next) => {
  try {
    const userId = z.string().min(1).parse(req.query.userId)

    const history = await withDb(
      () =>
        prisma.scanHistory.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" }
        }),
      "history read"
    )

    if (!history) {
      return res.json([])
    }

    const response = history.map((entry) => ({
      id: entry.id,
      userId: entry.userId,
      createdAt: entry.createdAt.toISOString(),
      productName: entry.productName,
      extractedText: entry.extractedText,
      parsedIngredients: entry.parsedIngredients,
      parsedNutrition: entry.parsedNutrition,
      analysisSnapshot: entry.analysisSnapshot
    }))

    return res.json(response)
  } catch (error) {
    return next(error)
  }
})

const createHistorySchema = z.object({
  userId: z.string().min(1),
  analysisSnapshot: z.any(),
  extractedText: z.any().optional(),
  parsedIngredients: z.array(z.string()).optional(),
  parsedNutrition: z.any().optional()
})

app.post("/history", async (req, res, next) => {
  try {
    const payload = createHistorySchema.parse(req.body)

    const created = await withDb(
      () =>
        prisma.scanHistory.create({
          data: {
            userId: payload.userId,
            productName: payload.analysisSnapshot?.productName || null,
            extractedText: sanitizeExtracted(payload.extractedText),
            parsedIngredients: payload.parsedIngredients,
            parsedNutrition: payload.parsedNutrition,
            analysisSnapshot: payload.analysisSnapshot
          }
        }),
      "history save"
    )

    if (!created) {
      return res.status(202).json({ status: "skipped", reason: "db_unavailable" })
    }

    return res.status(201).json({
      id: created.id,
      userId: created.userId,
      createdAt: created.createdAt.toISOString(),
      extractedText: created.extractedText,
      parsedIngredients: created.parsedIngredients,
      parsedNutrition: created.parsedNutrition,
      analysisSnapshot: created.analysisSnapshot
    })
  } catch (error) {
    return next(error)
  }
})

app.get("/prefs", async (req, res, next) => {
  try {
    const userId = z.string().min(1).parse(req.query.userId)
    const prefs = await withDb(
      () => prisma.userPrefs.findUnique({ where: { userId } }),
      "prefs read"
    )
    if (!prefs) {
      return res.status(503).json({ error: "Preferences unavailable" })
    }
    return res.json(prefs)
  } catch (error) {
    return next(error)
  }
})

const prefsSchema = z.object({
  userId: z.string().min(1),
  halalCheckEnabled: z.boolean(),
  lowSodiumMgLimit: z.number().nullable().optional(),
  lowSugarGlimit: z.number().nullable().optional(),
  lowCarbGlimit: z.number().nullable().optional(),
  lowCalorieLimit: z.number().nullable().optional(),
  highProteinGtarget: z.number().nullable().optional(),
  vegetarian: z.boolean().nullable().optional(),
  vegan: z.boolean().nullable().optional(),
  sensitiveStomach: z.boolean().nullable().optional()
})

app.post("/prefs", async (req, res, next) => {
  try {
    const payload = prefsSchema.parse(req.body)

    const prefs = await withDb(
      () =>
        prisma.userPrefs.upsert({
          where: { userId: payload.userId },
          update: {
            halalCheckEnabled: payload.halalCheckEnabled,
            lowSodiumMgLimit: payload.lowSodiumMgLimit,
            lowSugarGlimit: payload.lowSugarGlimit,
            lowCarbGlimit: payload.lowCarbGlimit,
            lowCalorieLimit: payload.lowCalorieLimit,
            highProteinGtarget: payload.highProteinGtarget,
            vegetarian: payload.vegetarian,
            vegan: payload.vegan,
            sensitiveStomach: payload.sensitiveStomach
          },
          create: payload
        }),
      "prefs save"
    )

    if (!prefs) {
      return res.status(202).json(payload)
    }

    return res.json(prefs)
  } catch (error) {
    return next(error)
  }
})

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    const errorStatus = (error as { status?: number })?.status
    const errorCode = (error as { code?: string })?.code
    const errorMessage = (error as { error?: { message?: string } })?.error?.message

    if (errorStatus === 429 || errorCode === "rate_limit_exceeded" || errorCode === "insufficient_quota") {
      return res.status(429).json({
        error:
          errorMessage ||
          "AI quota reached. Please add billing or wait for limits to reset, then try again."
      })
    }

    if ((error as { code?: string })?.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "Upload too large. Max 6MB per image." })
    }

    if (error instanceof OcrError) {
      return res.status(422).json({ error: error.message })
    }

    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request", details: error.flatten() })
    }

    console.error(error)
    return res.status(500).json({ error: "Server error" })
  }
)

app.listen(port, () => {
  console.log(`API running on port ${port}`)
})
