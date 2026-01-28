import { View, Text, StyleSheet } from "react-native"
import Svg, { Circle } from "react-native-svg"
import { theme } from "../theme"

type Props = {
  value: number
  size?: number
  strokeWidth?: number
  label?: string
}

export default function ScoreRing({ value, size = 120, strokeWidth = 12, label = "Health Score" }: Props) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, value))
  const dashOffset = circumference - (circumference * clamped) / 100

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size}>
        <Circle
          stroke={theme.colors.border}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={theme.colors.accent}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={[styles.center, { width: size, height: size }]} pointerEvents="none">
        <Text style={styles.value}>{Math.round(clamped)}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center"
  },
  center: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center"
  },
  value: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.text,
    fontFamily: theme.font.heading
  },
  label: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: 2
  }
})

