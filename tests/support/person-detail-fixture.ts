/** 档案详情组件测试共用的合成数据；不包含真实个人信息。 */
import { personDetailSchema } from "@/features/archive-view/schemas"

export const PERSON_DETAIL_FIXTURE = personDetailSchema.parse({
  id: "7",
  employeeNo: "E-001",
  name: "测试甲",
  identityCardMasked: "1234***********678",
  personal: {
    gender: "女",
    birthDate: "2000-01-01",
    nation: "汉族",
    nativePlace: "测试籍贯",
    birthPlace: "测试出生地",
    politicalStatus: "群众",
    politicalJoinDate: "",
    maritalStatus: "未婚",
    healthStatus: "健康",
    mailingAddress: "测试地址",
    postalCode: "000000",
    phoneNumberMasked: "1380****000",
  },
  employment: {
    organization: "测试单位",
    department: "测试部门",
    workStartDate: "2020-01-01",
    dispatchedToBiddingCompanyDate: "",
    position: "测试职务",
    titleOrSkill: "测试技能",
    titleOrSkillAcquiredDate: "",
  },
  education: {
    fullTime: { institutionName: "", departmentAndMajor: "", educationLevel: "", degreeName: "" },
    inService: { institutionName: "", departmentAndMajor: "", educationLevel: "", degreeName: "" },
  },
  mainEducation: [],
  workExperiences: [],
  rewardsPunishments: [],
  familyMembers: [],
  declaration: { signer: "", date: "" },
  photo: null,
  archive: { templateVersion: "V1", snapshotVersion: 1, updatedAt: "2026-07-22T03:00:00Z" },
})
