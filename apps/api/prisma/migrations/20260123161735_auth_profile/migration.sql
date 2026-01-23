-- AlterTable
ALTER TABLE `user` ADD COLUMN `resetTokenExpires` DATETIME(3) NULL,
    ADD COLUMN `resetTokenHash` VARCHAR(191) NULL;
