/** Electron UI tests share one fully synthetic active dossier response. */
export const E2E_PERSON_LIST_ITEM = {
  id: "7",
  employeeNo: "E-001",
  name: "测试甲",
  organization: "测试单位",
  department: "测试部门",
  position: "测试职务",
  titleOrSkill: "测试技能",
  updatedAt: "2026-07-22T03:00:00Z",
} as const

export const E2E_PERSON_DETAIL = {
  id: "7",
  employeeNo: "E-001",
  name: "测试甲",
  identityCardMasked: "1234***********678",
  personal: {
    gender: "女",
    birthDate: "2000-01-01",
    nation: "汉族",
    nativePlace: "湖南长沙",
    birthPlace: "湖南长沙",
    politicalStatus: "中共党员",
    politicalJoinDate: "2021-07-01",
    maritalStatus: "已婚",
    healthStatus: "健康",
    mailingAddress: "测试地址",
    postalCode: "410000",
    phoneNumberMasked: "1380****000",
  },
  employment: {
    organization: "测试单位",
    department: "测试部门",
    workStartDate: "2020-01-01",
    dispatchedToBiddingCompanyDate: "2021-01-01",
    position: "测试职务",
    titleOrSkill: "测试技能",
    titleOrSkillAcquiredDate: "2022-01-01",
  },
  education: {
    fullTime: {
      institutionName: "全日制大学",
      departmentAndMajor: "档案学",
      educationLevel: "本科",
      degreeName: "学士",
    },
    inService: {
      institutionName: "在职大学",
      departmentAndMajor: "管理学",
      educationLevel: "研究生",
      degreeName: "硕士",
    },
  },
  mainEducation: [{ sortOrder: 1, leftText: "2020.09-2024.06", rightText: "示例大学" }],
  workExperiences: [{ sortOrder: 1, leftText: "2024.07-至今", rightText: "覆盖版本" }],
  rewardsPunishments: [{ sortOrder: 1, leftText: "2025.01", rightText: "测试奖励" }],
  familyMembers: [
    {
      name: "测试乙",
      relationship: "子女",
      birthDate: "2000-07-23",
      age: 25,
      politicalStatus: "群众",
      organizationAndPosition: "测试单位及职务",
    },
  ],
  declaration: { signer: "测试甲", date: "2026-07-22" },
  photo: {
    mimeType: "image/png",
    originalFilename: "fixture.png",
    byteSize: 68,
    widthPixels: 1,
    heightPixels: 1,
  },
  archive: { templateVersion: "V1", snapshotVersion: 2, updatedAt: "2026-07-22T03:00:00Z" },
} as const

export const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
)
