/** 完整档案详情的运行时响应契约；所有外部字段在进入页面前一次性解析。 */
import { z } from "zod"
import { personIdSchema } from "@/shared/api/schemas"

const personalInfoSchema = z
  .object({
    gender: z.string(),
    birthDate: z.string(),
    nation: z.string(),
    nativePlace: z.string(),
    birthPlace: z.string(),
    politicalStatus: z.string(),
    politicalJoinDate: z.string(),
    maritalStatus: z.string(),
    healthStatus: z.string(),
    mailingAddress: z.string(),
    postalCode: z.string(),
    phoneNumber: z.string(),
  })
  .strict()

const employmentDetailsSchema = z
  .object({
    organization: z.string(),
    department: z.string(),
    workStartDate: z.string(),
    dispatchedToBiddingCompanyDate: z.string(),
    position: z.string(),
    titleOrSkill: z.string(),
    titleOrSkillAcquiredDate: z.string(),
  })
  .strict()

const educationSummarySchema = z
  .object({
    institutionName: z.string(),
    departmentAndMajor: z.string(),
    educationLevel: z.string(),
    degreeName: z.string(),
  })
  .strict()

const orderedTextSchema = z
  .object({
    sortOrder: z.number().int().positive(),
    leftText: z.string(),
    rightText: z.string(),
  })
  .strict()

const familyMemberSchema = z
  .object({
    name: z.string(),
    relationship: z.string(),
    birthDate: z.string(),
    age: z.number().int().nonnegative().nullable(),
    politicalStatus: z.string(),
    organizationAndPosition: z.string(),
  })
  .strict()

const photoMetadataSchema = z
  .object({
    mimeType: z.enum(["image/png", "image/jpeg"]),
    originalFilename: z.string(),
    byteSize: z.number().int().positive(),
    widthPixels: z.number().int().positive(),
    heightPixels: z.number().int().positive(),
  })
  .strict()

export const personDetailSchema = z
  .object({
    id: personIdSchema,
    employeeNo: z.string(),
    name: z.string(),
    identityCardMasked: z.string(),
    personal: personalInfoSchema,
    employment: employmentDetailsSchema,
    education: z
      .object({ fullTime: educationSummarySchema, inService: educationSummarySchema })
      .strict(),
    mainEducation: z.array(orderedTextSchema),
    workExperiences: z.array(orderedTextSchema),
    rewardsPunishments: z.array(orderedTextSchema),
    familyMembers: z.array(familyMemberSchema),
    declaration: z.object({ signer: z.string(), date: z.string() }).strict(),
    photo: photoMetadataSchema.nullable(),
    archive: z
      .object({
        templateVersion: z.string(),
        snapshotVersion: z.number().int().positive(),
        updatedAt: z.iso.datetime(),
      })
      .strict(),
  })
  .strict()

export type PersonDetail = z.infer<typeof personDetailSchema>
export type OrderedText = z.infer<typeof orderedTextSchema>
export type EducationSummary = z.infer<typeof educationSummarySchema>
