;(() => {
  const records = [
    [
      "PA-0001",
      "测试人员甲",
      "测试建设集团",
      "综合管理部",
      "项目负责人",
      "高级工程师",
      "2026/07/22 11:00",
    ],
    [
      "PA-0002",
      "测试人员申",
      "测试工程有限公司",
      "项目管理部",
      "档案管理员",
      "馆员",
      "2026/07/21 11:00",
    ],
    [
      "PA-0003",
      "测试人员甴",
      "测试建设集团",
      "项目管理部",
      "项目负责人",
      "高级工程师",
      "2026/07/20 11:00",
    ],
    [
      "PA-0004",
      "测试人员电",
      "测试工程有限公司",
      "综合管理部",
      "档案管理员",
      "馆员",
      "2026/07/19 11:00",
    ],
    [
      "PA-0005",
      "测试人员甶",
      "测试建设集团",
      "项目管理部",
      "项目负责人",
      "高级工程师",
      "2026/07/18 11:00",
    ],
    [
      "PA-0006",
      "测试人员男",
      "测试工程有限公司",
      "项目管理部",
      "档案管理员",
      "馆员",
      "2026/07/17 11:00",
    ],
    [
      "PA-0007",
      "测试人员甸",
      "测试建设集团",
      "综合管理部",
      "项目负责人",
      "高级工程师",
      "2026/07/16 11:00",
    ],
    [
      "PA-0008",
      "测试人员甹",
      "测试工程有限公司",
      "项目管理部",
      "档案管理员",
      "馆员",
      "2026/07/15 11:00",
    ],
  ]

  const rows = records
    .map(
      ([employeeNo, name, organization, department, position, title, updatedAt]) => `
        <tr>
          <td class="check-cell"><input class="row-check" type="checkbox" aria-label="选择 ${name}" /></td>
          <td class="employee-no">${employeeNo}</td>
          <td class="person-name">${name}</td>
          <td class="organization"><span>${organization}</span><small>${department}</small></td>
          <td>${position}</td>
          <td>${title}</td>
          <td class="updated-at">${updatedAt}</td>
          <td class="row-actions"><button type="button">查看</button><button type="button"><span aria-hidden="true">↓</span> 导出</button></td>
        </tr>`,
    )
    .join("")

  document.querySelector("#preview-root").innerHTML = `
    <div class="app-shell">
      <header class="brand-block">
        <div class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></div>
        <div class="brand-copy">
          <strong>人员档案助手</strong>
          <span>人员信息档案管理系统</span>
        </div>
      </header>

      <div class="nav-label">业务导航</div>
      <nav class="primary-nav" aria-label="主导航">
        <a class="nav-item active" href="#" aria-current="page"><span class="nav-icon" aria-hidden="true">▣</span><span>人员档案</span></a>
        <a class="nav-item" href="#"><span class="nav-icon" aria-hidden="true">⌕</span><span>家庭成员查询</span></a>
        <a class="nav-item" href="#"><span class="nav-icon" aria-hidden="true">⇧</span><span>批量导入档案</span></a>
        <a class="nav-item" href="#"><span class="nav-icon" aria-hidden="true">⚙</span><span>文件夹设置</span></a>
      </nav>

      <footer class="user-panel">
        <span class="user-avatar">本</span>
        <div class="user-copy"><strong>本地测试管理员</strong><small>admin</small></div>
        <button class="logout-button" type="button">退出</button>
      </footer>

      <main class="workspace">
        <header class="page-title"><h1>人员档案</h1></header>

        <section class="overview" aria-label="档案筛选">
          <div class="count-panel"><span>档案总数</span><strong>8</strong></div>
          <form class="filter-form">
            <label class="filter-field"><span>姓名</span><input name="name" placeholder="输入姓名片段" /></label>
            <label class="filter-field"><span>人员编号</span><input name="employeeNo" placeholder="输入编号片段" /></label>
            <label class="filter-field"><span>单位 / 部门</span><input name="department" placeholder="输入单位或部门" /></label>
            <div class="filter-actions">
              <button class="primary-button" type="submit"><span aria-hidden="true">⌕</span> 筛选档案</button>
              <button class="secondary-button reset-button" type="button" disabled>重置</button>
            </div>
          </form>
        </section>

        <section class="directory">
          <header class="directory-header">
            <div class="directory-title"><strong>在册档案目录</strong><span>共 8 份当前有效档案</span></div>
            <div class="batch-actions"><span>勾选档案后可打包导出</span><button class="batch-button" type="button" disabled><span aria-hidden="true">↓</span> 导出档案包</button></div>
          </header>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th class="check-cell"><input class="select-all" type="checkbox" aria-label="选择当前页全部档案" /></th>
                  <th>人员编号</th><th>姓名</th><th>单位 / 部门</th><th>职务</th><th>职称 / 技能</th><th>更新日期</th><th>档案操作</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>

          <footer class="pagination">
            <span>每页 20 条，共 8 条</span>
            <div class="pager"><button type="button" disabled aria-label="上一页">‹</button><button class="current" type="button" aria-current="page">1</button><button type="button" disabled aria-label="下一页">›</button></div>
          </footer>
        </section>
      </main>
    </div>`

  const form = document.querySelector(".filter-form")
  const resetButton = document.querySelector(".reset-button")
  const selectAll = document.querySelector(".select-all")
  const rowChecks = [...document.querySelectorAll(".row-check")]
  const batchButton = document.querySelector(".batch-button")

  const updateFilterState = () => {
    resetButton.disabled = ![...form.elements].some(
      (element) => element instanceof HTMLInputElement && element.value,
    )
  }

  const updateSelectionState = () => {
    const selectedCount = rowChecks.filter((checkbox) => checkbox.checked).length
    batchButton.disabled = selectedCount === 0
    selectAll.checked = selectedCount === rowChecks.length
    selectAll.indeterminate = selectedCount > 0 && selectedCount < rowChecks.length
  }

  form.addEventListener("submit", (event) => event.preventDefault())
  form.addEventListener("input", updateFilterState)
  resetButton.addEventListener("click", () => {
    form.reset()
    updateFilterState()
  })
  selectAll.addEventListener("change", () => {
    rowChecks.forEach((checkbox) => {
      checkbox.checked = selectAll.checked
    })
    updateSelectionState()
  })
  rowChecks.forEach((checkbox) => {
    checkbox.addEventListener("change", updateSelectionState)
  })
  document.querySelectorAll("a[href='#']").forEach((link) => {
    link.addEventListener("click", (event) => event.preventDefault())
  })
})()
