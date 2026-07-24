/** 人员目录的 Avue 表格契约：只描述既有列，不接管查询、分页或后端业务规则。 */
import type { PersonListItem } from "./schemas"

type PersonListColumn = {
  readonly label: string
  readonly prop: keyof PersonListItem
  readonly minWidth?: number
  readonly width?: number
}

type PersonListCrudOption = {
  readonly header: boolean
  readonly page: boolean
  readonly menu: boolean
  readonly menuTitle: string
  readonly menuWidth: number
  readonly menuFixed: "right"
  readonly menuAlign: "left"
  readonly selection: boolean
  readonly selectionWidth: number
  readonly selectionFixed: boolean
  readonly tip: boolean
  readonly selectClearBtn: boolean
  readonly addBtn: boolean
  readonly editBtn: boolean
  readonly delBtn: boolean
  readonly viewBtn: boolean
  readonly copyBtn: boolean
  readonly refreshBtn: boolean
  readonly columnBtn: boolean
  readonly filterBtn: boolean
  readonly gridBtn: boolean
  readonly border: boolean
  readonly stripe: boolean
  readonly align: "left"
  readonly headerAlign: "left"
  readonly rowKey: "id"
  readonly column: readonly PersonListColumn[]
}

export const PERSON_LIST_CRUD_OPTION = {
  header: false,
  page: false,
  menu: true,
  menuTitle: "档案操作",
  menuWidth: 190,
  menuFixed: "right",
  menuAlign: "left",
  selection: true,
  selectionWidth: 44,
  selectionFixed: false,
  tip: false,
  selectClearBtn: false,
  addBtn: false,
  editBtn: false,
  delBtn: false,
  viewBtn: false,
  copyBtn: false,
  refreshBtn: false,
  columnBtn: false,
  filterBtn: false,
  gridBtn: false,
  border: true,
  stripe: true,
  align: "left",
  headerAlign: "left",
  rowKey: "id",
  column: [
    { label: "人员编号", prop: "employeeNo", minWidth: 110 },
    { label: "姓名", prop: "name", minWidth: 105 },
    { label: "单位 / 部门", prop: "organization", minWidth: 190 },
    { label: "职务", prop: "position", minWidth: 115 },
    { label: "职称 / 技能", prop: "titleOrSkill", minWidth: 120 },
    { label: "更新日期", prop: "updatedAt", width: 145 },
  ],
} as const satisfies PersonListCrudOption
