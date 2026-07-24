;(() => {
  const option = Number(document.body.dataset.option || "1")

  const records = [
    {
      no: "PA-0001",
      name: "测试人员甲",
      company: "测试建设集团",
      department: "综合管理部",
      position: "项目负责人",
      title: "高级工程师",
      updated: "2026-07-22 11:00",
      status: "在册",
    },
    {
      no: "PA-0002",
      name: "测试人员乙",
      company: "测试工程有限公司",
      department: "人力资源部",
      position: "档案管理员",
      title: "馆员",
      updated: "2026-07-21 16:24",
      status: "在册",
    },
    {
      no: "PA-0003",
      name: "测试人员丙",
      company: "测试建设集团",
      department: "项目管理部",
      position: "部门副经理",
      title: "高级经济师",
      updated: "2026-07-20 09:18",
      status: "在册",
    },
    {
      no: "PA-0004",
      name: "测试人员丁",
      company: "测试工程有限公司",
      department: "技术质量部",
      position: "技术主管",
      title: "工程师",
      updated: "2026-07-19 14:06",
      status: "在册",
    },
    {
      no: "PA-0005",
      name: "测试人员戊",
      company: "测试建设集团",
      department: "财务资金部",
      position: "业务主管",
      title: "会计师",
      updated: "2026-07-18 10:32",
      status: "在册",
    },
    {
      no: "PA-0006",
      name: "测试人员己",
      company: "测试工程有限公司",
      department: "安全生产部",
      position: "安全主管",
      title: "注册安全工程师",
      updated: "2026-07-17 17:12",
      status: "在册",
    },
    {
      no: "PA-0007",
      name: "测试人员庚",
      company: "测试建设集团",
      department: "市场经营部",
      position: "业务经理",
      title: "经济师",
      updated: "2026-07-16 13:40",
      status: "在册",
    },
    {
      no: "PA-0008",
      name: "测试人员辛",
      company: "测试工程有限公司",
      department: "办公室",
      position: "行政专员",
      title: "政工师",
      updated: "2026-07-15 08:56",
      status: "在册",
    },
  ]

  const familyMatches = [
    {
      member: "测试家属甲",
      relation: "父亲",
      person: "测试人员甲",
      company: "测试建设集团",
      department: "综合管理部",
      position: "项目负责人",
      title: "高级工程师",
    },
    {
      member: "测试家属甲乙",
      relation: "配偶",
      person: "测试人员丙",
      company: "测试建设集团",
      department: "项目管理部",
      position: "部门副经理",
      title: "高级经济师",
    },
    {
      member: "测试家属甲丙",
      relation: "母亲",
      person: "测试人员己",
      company: "测试工程有限公司",
      department: "安全生产部",
      position: "安全主管",
      title: "注册安全工程师",
    },
  ]

  const iconPaths = {
    archive: '<path d="M5 4.5h14v3H5zM6.5 8.5h11v11h-11zM9 12h6M9 15h4"/>',
    search: '<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 4 4"/>',
    upload: '<path d="M12 16V5m0 0L8 9m4-4 4 4M5 18.5h14"/>',
    settings:
      '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5l-.4 3.1a8 8 0 0 0-1.7 1l-2.4-1-2 3.4L5.1 11a7 7 0 0 0 0 2L3 14.5 5 18l2.4-1a8 8 0 0 0 1.7 1l.4 3h5l.4-3a8 8 0 0 0 1.7-1l2.4 1 2-3.5-2.1-1.5a7 7 0 0 0 .1-1Z"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M5.5 20c.6-4 2.8-6 6.5-6s5.9 2 6.5 6"/>',
    bell: '<path d="M6.5 16.5h11L16 14V9a4 4 0 0 0-8 0v5l-1.5 2.5ZM10 19h4"/>',
    shield:
      '<path d="M12 3 19 6v5c0 4.5-2.4 7.6-7 10-4.6-2.4-7-5.5-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4"/>',
    download: '<path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    back: '<path d="m15 5-7 7 7 7M8 12h11"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    refresh: '<path d="M19 8V4l-2 2a8 8 0 1 0 2.2 8"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    folder: '<path d="M3.5 7h7l2-2h8v14h-17z"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
    close: '<path d="m7 7 10 10M17 7 7 17"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    building: '<path d="M5 20V6l7-3 7 3v14M9 8h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1M3 20h18"/>',
  }

  function icon(name, className = "") {
    return `<svg class="ui-icon ${className}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${iconPaths[name]}</svg>`
  }

  const root = document.querySelector("#prototype-root")
  root.innerHTML = `
    <div class="enterprise-app option-${option}">
      <header class="global-header">
        <div class="brand-area">
          <div class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></div>
          <div class="brand-copy">
            <strong>人员档案助手</strong>
            <small>人员信息档案管理系统</small>
          </div>
        </div>
        <div class="header-context">
          <span class="header-context-label">当前组织</span>
          <strong>${icon("building")} 测试集团总部</strong>
          <span class="header-separator"></span>
          <span>人力资源部</span>
        </div>
        <div class="header-tools">
          <span class="security-state">${icon("shield")} 内网安全连接</span>
          <button class="icon-button" type="button" aria-label="通知">${icon("bell")}<span class="notice-dot"></span></button>
          <div class="user-entry">
            <span class="user-avatar">管</span>
            <span class="user-name"><b>本地测试管理员</b><small>系统管理员</small></span>
            ${icon("chevron")}
          </div>
        </div>
      </header>

      <nav class="primary-nav" aria-label="主导航">
        <div class="nav-heading"><span>业务中心</span><small>WORKSPACE</small></div>
        <div class="nav-items">
          ${navButton("people", "archive", "人员档案", "在册人员与档案目录")}
          ${navButton("family", "search", "家庭成员查询", "按成员姓名关联查档")}
          ${navButton("import", "upload", "批量导入", "工作簿校验与入库")}
          ${navButton("settings", "settings", "文件夹设置", "自动扫描与归档路径")}
        </div>
        <div class="nav-footer">
          <span>${icon("shield")} 数据服务正常</span>
          <small>2026-07-23 · 14:32</small>
        </div>
      </nav>

      ${contextRail(option)}

      <main class="workspace">
        <header class="workspace-topbar">
          <div class="breadcrumbs"><span>首页</span>${icon("chevron")}<strong id="breadcrumb-current">人员档案</strong></div>
          <div class="workspace-tools">
            <span class="business-date">工作日：2026-07-23</span>
            <button class="quiet-button" type="button" data-toast="页面数据已刷新">${icon("refresh")} 刷新</button>
            <button class="quiet-button compact-only" type="button" data-toast="已打开操作指引">操作指引</button>
          </div>
        </header>
        <div class="view-root" id="view-root"></div>
      </main>

      <footer class="system-status">
        <span>${icon("shield")} 权限：系统管理员</span>
        <span>服务状态：正常</span>
        <span>版本：预览稿 v2</span>
      </footer>
      <div class="toast" id="toast" role="status" aria-live="polite"></div>
    </div>
  `

  function navButton(view, iconName, label, description) {
    return `<button class="nav-item${view === "people" ? " active" : ""}" type="button" data-view="${view}" aria-current="${view === "people" ? "page" : "false"}">
      <span class="nav-icon">${icon(iconName)}</span>
      <span class="nav-copy"><b>${label}</b><small>${description}</small></span>
      ${icon("chevron", "nav-chevron")}
    </button>`
  }

  function contextRail(optionNumber) {
    if (optionNumber === 2) {
      return `<aside class="context-rail secondary-directory" aria-label="人员档案二级导航">
        <header><span>人员档案</span><small>PERSONNEL</small></header>
        <div class="context-menu">
          <button class="active" type="button" data-view="people"><span>在册档案目录</span><small>1,286</small></button>
          <button type="button" data-view="family"><span>家庭成员查询</span><small>关联查找</small></button>
          <button type="button" data-view="import"><span>档案批量导入</span><small>3 待处理</small></button>
          <button type="button" data-toast="历史版本入口仅作结构展示"><span>历史版本</span><small>审计入口</small></button>
        </div>
        <section class="context-note"><b>本月工作</b><dl><div><dt>新增档案</dt><dd>42</dd></div><div><dt>覆盖更新</dt><dd>17</dd></div><div><dt>待确认</dt><dd class="warning-text">3</dd></div></dl></section>
      </aside>`
    }
    if (optionNumber === 3) {
      return `<aside class="context-rail archive-finder" aria-label="档案快速检索">
        <header><span>档案快速检索</span><small>QUICK FINDER</small></header>
        <form class="rail-filter" id="rail-filter">
          <label><span>姓名</span><input type="search" placeholder="输入姓名片段" /></label>
          <label><span>人员编号</span><input type="search" placeholder="如 PA-0001" /></label>
          <label><span>单位 / 部门</span><input type="search" placeholder="输入组织名称" /></label>
          <button class="primary-button full-button" type="submit">${icon("search")} 检索档案</button>
          <button class="text-button" type="reset">清空条件</button>
        </form>
        <section class="saved-searches"><b>常用目录</b><button type="button" data-toast="已切换至本月更新">${icon("clock")} 本月更新 <span>59</span></button><button type="button" data-toast="已切换至资料待完善">${icon("folder")} 资料待完善 <span>12</span></button></section>
      </aside>`
    }
    if (optionNumber === 5) {
      return `<aside class="context-rail task-center" aria-label="当日业务状态">
        <header><span>当日业务</span><small>2026-07-23</small></header>
        <section class="task-summary"><div><span>待处理</span><strong>3</strong></div><div><span>今日导入</span><strong>14</strong></div></section>
        <section class="task-list"><b>需要关注</b><button type="button" data-view="import"><i class="task-marker urgent"></i><span><strong>3 份重复档案</strong><small>等待覆盖或跳过决定</small></span><em>处理</em></button><button type="button" data-toast="已打开归档失败记录"><i class="task-marker"></i><span><strong>1 份文件待重试</strong><small>本地归档移动失败</small></span><em>查看</em></button></section>
        <section class="recent-list"><b>最近访问</b><button type="button" data-action="open-detail"><span>测试人员甲</span><small>11:26</small></button><button type="button" data-action="open-detail"><span>测试人员丙</span><small>10:42</small></button><button type="button" data-action="open-detail"><span>测试人员己</span><small>09:18</small></button></section>
      </aside>`
    }
    return `<aside class="context-rail context-placeholder" aria-hidden="true"></aside>`
  }

  const viewRoot = document.querySelector("#view-root")
  const breadcrumb = document.querySelector("#breadcrumb-current")
  let toastTimer = null

  function renderView(view) {
    if (view === "settings") {
      viewRoot.innerHTML = renderSettings()
      breadcrumb.textContent = "文件夹设置"
    } else if (view === "family") {
      viewRoot.innerHTML = renderFamily()
      breadcrumb.textContent = "家庭成员查询"
    } else if (view === "import") {
      viewRoot.innerHTML = renderImport()
      breadcrumb.textContent = "批量导入"
    } else if (view === "detail") {
      viewRoot.innerHTML = renderDetail()
      breadcrumb.textContent = "档案详情"
    } else {
      viewRoot.innerHTML = renderPeople()
      breadcrumb.textContent = "人员档案"
    }
    bindViewInteractions()
    viewRoot.scrollTop = 0
  }

  function pageHeading(eyebrow, heading, description, actions = "") {
    return `<header class="page-heading">
      <div class="heading-copy"><span class="page-eyebrow">${eyebrow}</span><h1>${heading}</h1><p>${description}</p></div>
      <div class="heading-actions">${actions}</div>
    </header>`
  }

  function renderPeople() {
    const rows = records
      .map(
        (
          record,
          index,
        ) => `<tr class="${index === 0 ? "is-current" : ""}" data-record="${record.no}">
      <td class="check-cell"><input class="row-check" type="checkbox" aria-label="选择 ${record.name}" /></td>
      <td class="number-cell"><span>${record.no}</span></td>
      <td><button class="name-link" type="button" data-action="open-detail">${record.name}</button></td>
      <td class="organization-cell"><span>${record.company}</span><small>${record.department}</small></td>
      <td>${record.position}</td>
      <td>${record.title}</td>
      <td class="date-cell">${record.updated}</td>
      <td><span class="status-badge success">${record.status}</span></td>
      <td class="row-actions"><button type="button" data-action="open-detail">查看</button><button type="button" data-toast="已生成脱敏演示导出任务">${icon("download")} 导出</button></td>
    </tr>`,
      )
      .join("")

    return `<section class="page-view people-view">
      ${pageHeading("PERSONNEL ARCHIVE · 档案业务", "人员档案", "集中查询、查看和导出当前有效人员档案。", `<button class="secondary-button" type="button" data-view="import">${icon("upload")} 批量导入</button><button class="primary-button" id="batch-export" type="button" disabled>${icon("download")} 批量导出</button>`)}

      <section class="metric-strip" aria-label="档案统计">
        <div class="metric-primary"><span>当前有效档案</span><strong>1,286</strong><small>份</small></div>
        <div><span>本月新增</span><strong>42</strong><small>较上月 +8</small></div>
        <div><span>本月更新</span><strong>59</strong><small>含覆盖 17 份</small></div>
        <div><span>待处理事项</span><strong class="warning-text">3</strong><small>重复档案待决定</small></div>
      </section>

      <form class="filter-panel" id="people-filter">
        <div class="filter-title">${icon("filter")}<span><b>筛选条件</b><small>支持姓名、编号和组织模糊查询</small></span></div>
        <label><span>姓名</span><input type="search" name="name" placeholder="输入姓名片段" /></label>
        <label><span>人员编号</span><input type="search" name="employeeNo" placeholder="输入编号片段" /></label>
        <label><span>单位 / 部门</span><input type="search" name="department" placeholder="输入单位或部门" /></label>
        <div class="filter-actions"><button class="primary-button" type="submit">${icon("search")} 查询</button><button class="secondary-button reset-filter" type="reset">重置</button></div>
      </form>

      <div class="list-layout">
        <section class="data-panel">
          <header class="panel-heading">
            <div><span class="panel-kicker">档案目录</span><h2>在册档案</h2><p>已按最近更新时间排序</p></div>
            <div class="panel-tools"><span id="selection-message">未选择档案</span><button class="quiet-button" type="button" data-toast="列设置仅作原型展示">列设置</button>${icon("more")}</div>
          </header>
          <div class="table-scroll">
            <table class="business-table personnel-table">
              <thead><tr><th class="check-cell"><input id="select-all" type="checkbox" aria-label="选择当前页全部档案" /></th><th>人员编号</th><th>姓名</th><th>单位 / 部门</th><th>职务</th><th>职称 / 技能</th><th>更新时间</th><th>状态</th><th>操作</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          ${pagination("共 1,286 份档案", 1, 65)}
        </section>

        <aside class="record-preview" aria-label="档案快速预览">
          <header><span>快速预览</span><button type="button" aria-label="关闭预览">${icon("close")}</button></header>
          <div class="preview-person"><span class="portrait-placeholder">甲</span><div><h3>测试人员甲</h3><p>PA-0001</p><span class="status-badge success">当前有效</span></div></div>
          <dl><div><dt>所在单位</dt><dd>测试建设集团</dd></div><div><dt>部门</dt><dd>综合管理部</dd></div><div><dt>职务</dt><dd>项目负责人</dd></div><div><dt>职称</dt><dd>高级工程师</dd></div><div><dt>更新时间</dt><dd>2026-07-22 11:00</dd></div></dl>
          <button class="primary-button full-button" type="button" data-action="open-detail">查看完整档案 ${icon("chevron")}</button>
          <button class="secondary-button full-button" type="button" data-toast="已生成脱敏演示导出任务">${icon("download")} 导出 Excel</button>
        </aside>
      </div>
    </section>`
  }

  function renderFamily() {
    const rows = familyMatches
      .map(
        (item) => `<tr>
      <td><strong class="member-name">${item.member}</strong><small class="subline">${item.relation}</small></td>
      <td><button class="name-link" type="button" data-action="open-detail">${item.person}</button></td>
      <td class="organization-cell"><span>${item.company}</span><small>${item.department}</small></td>
      <td>${item.position}</td><td>${item.title}</td>
      <td class="row-actions"><button type="button" data-action="open-detail">查看档案</button></td>
    </tr>`,
      )
      .join("")

    return `<section class="page-view family-view">
      ${pageHeading("FAMILY MEMBER SEARCH · 关联查询", "家庭成员查询", "按家庭成员姓名查找关联人员档案，同名结果不会合并。", `<button class="secondary-button" type="button" data-view="people">返回档案目录</button>`)}
      <section class="query-panel">
        <div class="query-symbol">${icon("search")}</div>
        <div class="query-copy"><h2>查找关联档案</h2><p>输入家庭成员姓名或姓名片段</p></div>
        <label class="large-search"><span class="sr-only">家庭成员姓名</span>${icon("search")}<input id="family-query" type="search" value="测试家属甲" placeholder="例如：输入“晓华”" /></label>
        <button class="primary-button" id="family-search" type="button">查询关联档案</button>
      </section>
      <section class="data-panel family-results">
        <header class="panel-heading"><div><span class="panel-kicker">查询结果</span><h2>共 3 条匹配记录</h2><p>“测试家属甲”相关结果，不合并同名人员</p></div><span class="result-rule">结果范围：当前有效档案</span></header>
        <div class="table-scroll"><table class="business-table"><thead><tr><th>匹配成员 / 关系</th><th>档案姓名</th><th>单位 / 部门</th><th>职务</th><th>职称 / 技能</th><th>档案操作</th></tr></thead><tbody>${rows}</tbody></table></div>
        ${pagination("共 3 条匹配记录", 1, 1)}
      </section>
    </section>`
  }

  function renderImport() {
    return `<section class="page-view import-view">
      ${pageHeading("BATCH IMPORT · 工作簿入库", "批量导入", "统一完成工作簿选择、服务端校验、重复决定和本地归档。", `<button class="secondary-button" type="button" data-toast="已打开导入规则说明">查看导入规则</button>`)}
      <ol class="process-strip" aria-label="导入流程">
        <li class="done"><span>${icon("check")}</span><div><b>选择文件</b><small>选择或自动扫描</small></div></li>
        <li class="active"><span>2</span><div><b>校验内容</b><small>模板与字段检查</small></div></li>
        <li><span>3</span><div><b>处理重复</b><small>默认跳过，显式覆盖</small></div></li>
        <li><span>4</span><div><b>完成入库</b><small>记录结果并本地归档</small></div></li>
      </ol>

      <div class="import-layout">
        <section class="upload-panel">
          <div class="upload-illustration">${icon("upload")}</div>
          <div><h2>选择人员档案工作簿</h2><p>仅支持 .xlsx；每批最多 100 份，单份不超过 12 MiB。</p><small>也可以把文件放入已设置的待上传文件夹，由客户端自动扫描。</small></div>
          <div class="upload-actions"><button class="secondary-button" type="button" data-toast="已模拟打开文件选择窗口">选择文件</button><button class="primary-button" type="button" data-toast="3 份文件已进入服务端校验">上传并校验</button></div>
        </section>
        <aside class="import-summary">
          <header>当前批次 <span>BAT-20260723-014</span></header>
          <dl><div><dt>工作簿</dt><dd>3</dd></div><div><dt>校验通过</dt><dd class="success-text">2</dd></div><div><dt>待决定</dt><dd class="warning-text">1</dd></div><div><dt>失败</dt><dd>0</dd></div></dl>
          <button class="text-button" type="button" data-toast="批次详情已展开">查看批次详情 ${icon("chevron")}</button>
        </aside>
      </div>

      <section class="data-panel import-results">
        <header class="panel-heading"><div><span class="panel-kicker">当前批次</span><h2>文件处理结果</h2><p>2 / 3 已处理，1 项需要明确决定</p></div><span class="status-badge warning">1 项待确认</span></header>
        <div class="table-scroll"><table class="business-table"><thead><tr><th>工作簿</th><th>来源</th><th>状态</th><th>处理说明</th><th>本地文件</th><th>操作</th></tr></thead><tbody>
          <tr><td class="file-name">测试人员甲-个人基本情况表.xlsx</td><td><span class="source-tag">手动选择</span></td><td><span class="status-badge success">已导入</span></td><td>已生成新的有效档案</td><td>保留原路径</td><td class="row-actions">—</td></tr>
          <tr><td class="file-name">测试人员乙-个人基本情况表.xlsx</td><td><span class="source-tag auto">自动扫描</span></td><td><span class="status-badge warning">待确认</span></td><td>发现姓名与证件一致的有效档案</td><td>等待成功后归档</td><td class="row-actions"><button type="button" data-toast="默认选择“跳过”，覆盖需要二次确认">确认处理</button></td></tr>
          <tr><td class="file-name">测试人员丙-个人基本情况表.xlsx</td><td><span class="source-tag auto">自动扫描</span></td><td><span class="status-badge success">已更新</span></td><td>原档案已保留为历史快照</td><td>已移至归档文件夹</td><td class="row-actions">—</td></tr>
        </tbody></table></div>
        ${pagination("本批次共 3 份工作簿", 1, 1)}
      </section>
    </section>`
  }

  function renderDetail() {
    return `<section class="page-view detail-view">
      <div class="detail-back-row"><button class="back-button" type="button" data-view="people">${icon("back")} 返回档案目录</button><span>当前有效快照 · 更新于 2026-07-22 11:00</span></div>
      <header class="dossier-header">
        <div class="dossier-spine"><span>人员档案</span><small>PA</small></div>
        <div class="dossier-person"><span class="portrait-large">甲</span><div><span class="page-eyebrow">档案编号 PA-0001</span><h1>测试人员甲</h1><p>测试建设集团 · 综合管理部 · 项目负责人</p><div class="dossier-tags"><span class="status-badge success">当前有效</span><span>高级工程师</span><span>更新时间 2026-07-22</span></div></div></div>
        <div class="dossier-actions"><button class="secondary-button" type="button" data-toast="打印功能仅作结构展示">打印摘要</button><button class="primary-button" type="button" data-toast="已生成脱敏演示导出任务">${icon("download")} 下载并打开 Excel</button></div>
        <div class="formal-mark" aria-hidden="true"><span>在</span><span>册</span></div>
      </header>

      <nav class="detail-tabs" aria-label="档案内容索引"><button class="active" type="button" data-section="identity">基本与任职</button><button type="button" data-section="education">学历教育</button><button type="button" data-section="career">经历奖惩</button><button type="button" data-section="family-detail">家庭与申报</button></nav>

      <div class="detail-layout">
        <div class="detail-main">
          <section class="detail-section" id="identity"><header><span>01</span><div><h2>基本信息与当前任职</h2><p>个人基础资料、联系方式和现任岗位</p></div></header>
            <div class="identity-layout">
              <div class="photo-card"><div class="photo-placeholder">档案照片</div><small>JPEG · 480 × 640</small></div>
              <dl class="field-grid"><div><dt>姓名</dt><dd>测试人员甲</dd></div><div><dt>性别</dt><dd>男</dd></div><div><dt>出生日期</dt><dd>1990-01-01</dd></div><div><dt>民族</dt><dd>汉族</dd></div><div><dt>证件号码</dt><dd><span id="identity-value">1101***********123</span><button class="inline-action" id="reveal-value" type="button">显示</button></dd></div><div><dt>联系电话</dt><dd>138********123</dd></div><div><dt>政治面貌</dt><dd>中共党员</dd></div><div><dt>参加工作日期</dt><dd>2012-07-01</dd></div><div class="wide"><dt>工作单位</dt><dd>测试建设集团</dd></div><div><dt>所在部门</dt><dd>综合管理部</dd></div><div><dt>现任职务</dt><dd>项目负责人</dd></div></dl>
            </div>
          </section>

          <section class="detail-section" id="education"><header><span>02</span><div><h2>学历教育</h2><p>全日制、在职教育与主要学习经历</p></div></header>
            <div class="summary-pairs"><div><span>全日制教育</span><strong>大学本科 · 工程管理</strong><small>测试大学 · 2012-06</small></div><div><span>在职教育</span><strong>管理学硕士</strong><small>测试学院 · 2018-12</small></div></div>
            <table class="record-table"><thead><tr><th>起止时间</th><th>院校及专业</th><th>学习形式</th></tr></thead><tbody><tr><td>2008-09 至 2012-06</td><td>测试大学 · 工程管理专业</td><td>全日制</td></tr><tr><td>2016-03 至 2018-12</td><td>测试学院 · 管理学专业</td><td>在职</td></tr></tbody></table>
          </section>

          <section class="detail-section" id="career"><header><span>03</span><div><h2>工作经历与奖惩</h2><p>按原工作簿顺序完整保留</p></div></header>
            <table class="record-table"><thead><tr><th>起止时间</th><th>工作单位及职务</th></tr></thead><tbody><tr><td>2012-07 至 2016-04</td><td>测试工程有限公司 · 项目专员</td></tr><tr><td>2016-05 至 2021-12</td><td>测试建设集团 · 项目主管</td></tr><tr><td>2022-01 至今</td><td>测试建设集团 · 综合管理部项目负责人</td></tr></tbody></table>
          </section>

          <section class="detail-section" id="family-detail"><header><span>04</span><div><h2>家庭成员与申报</h2><p>家庭成员年龄按出生日期即时计算</p></div></header>
            <table class="record-table"><thead><tr><th>称谓</th><th>姓名</th><th>出生日期</th><th>政治面貌</th><th>工作单位及职务</th></tr></thead><tbody><tr><td>父亲</td><td>测试家属甲</td><td>1963-02-01</td><td>群众</td><td>已退休</td></tr><tr><td>配偶</td><td>测试家属乙</td><td>1991-06-12</td><td>中共党员</td><td>测试单位 · 职员</td></tr></tbody></table>
          </section>
        </div>
        <aside class="detail-aside"><section><b>档案目录</b><button class="active" type="button" data-section="identity"><span>01</span> 基本与任职</button><button type="button" data-section="education"><span>02</span> 学历教育</button><button type="button" data-section="career"><span>03</span> 经历奖惩</button><button type="button" data-section="family-detail"><span>04</span> 家庭与申报</button></section><section class="snapshot-info"><b>快照信息</b><dl><div><dt>状态</dt><dd>当前有效</dd></div><div><dt>导入方式</dt><dd>覆盖更新</dd></div><div><dt>操作人</dt><dd>本地测试管理员</dd></div></dl></section></aside>
      </div>
    </section>`
  }

  function renderSettings() {
    return `<section class="page-view settings-view">
      ${pageHeading("FOLDER WORKFLOW · 本地文件流转", "文件夹设置", "设置自动扫描和成功归档目录；业务数据仍只通过服务端 API 处理。", `<button class="primary-button" type="button" data-toast="设置已保存（原型演示）">保存设置</button>`)}
      <section class="settings-panel">
        <header><div class="setting-icon">${icon("folder")}</div><div><h2>自动导入文件夹</h2><p>登录且具备导入权限时，客户端定时扫描待上传目录中的 .xlsx 文件。</p></div><span class="status-badge success">自动扫描已开启</span></header>
        <div class="path-setting"><label><span>待上传文件夹</span><div><input value="D:\\人员档案\\待上传" readonly /><button class="secondary-button" type="button" data-toast="已模拟打开目录选择窗口">选择目录</button></div><small>仅扫描当前目录中的直接子文件，不递归读取子目录。</small></label><label><span>成功归档文件夹</span><div><input value="D:\\人员档案\\已归档" readonly /><button class="secondary-button" type="button" data-toast="已模拟打开目录选择窗口">选择目录</button></div><small>自动来源成功导入后安全移动；同名文件自动添加序号，不覆盖已有文件。</small></label></div>
      </section>
      <section class="data-panel workflow-rules"><header class="panel-heading"><div><span class="panel-kicker">流转规则</span><h2>文件处理边界</h2><p>确保导入结果、源文件和本地归档状态可追溯</p></div></header><div class="rule-grid"><article><span>01</span><h3>手动选择</h3><p>文件始终保留原路径，不执行自动移动。</p></article><article><span>02</span><h3>自动扫描</h3><p>仅在导入或覆盖成功后移动到归档目录。</p></article><article><span>03</span><h3>失败保护</h3><p>上传、决定或移动失败时保留源文件并允许重试。</p></article></div></section>
    </section>`
  }

  function pagination(summary, current, pages) {
    const pageButtons =
      pages <= 3
        ? Array.from(
            { length: pages },
            (_, index) =>
              `<button class="${index + 1 === current ? "current" : ""}" type="button">${index + 1}</button>`,
          ).join("")
        : `<button class="current" type="button">${current}</button><button type="button">${current + 1}</button><button type="button">${current + 2}</button><span>…</span><button type="button">${pages}</button>`
    return `<footer class="pagination"><span>${summary} · 每页 20 条</span><div><button type="button" disabled aria-label="上一页">‹</button>${pageButtons}<button type="button" ${pages === 1 ? "disabled" : ""} aria-label="下一页">›</button></div></footer>`
  }

  function bindViewInteractions() {
    viewRoot.querySelectorAll("[data-view]").forEach((button) => {
      button.addEventListener("click", () => selectView(button.dataset.view))
    })
    viewRoot.querySelectorAll("[data-action='open-detail']").forEach((button) => {
      button.addEventListener("click", () => selectView("detail"))
    })
    viewRoot.querySelectorAll("[data-toast]").forEach((button) => {
      button.addEventListener("click", () => showToast(button.dataset.toast))
    })

    const peopleFilter = document.querySelector("#people-filter")
    if (peopleFilter) {
      peopleFilter.addEventListener("submit", (event) => {
        event.preventDefault()
        showToast("已按当前条件筛选，共找到 8 条演示记录")
      })
    }
    const railFilter = document.querySelector("#rail-filter")
    if (railFilter && !railFilter.dataset.bound) {
      railFilter.dataset.bound = "true"
      railFilter.addEventListener("submit", (event) => {
        event.preventDefault()
        showToast("已按快速检索条件更新档案目录")
      })
    }
    const familySearch = document.querySelector("#family-search")
    if (familySearch) familySearch.addEventListener("click", () => showToast("已找到 3 条关联档案"))

    const selectAll = document.querySelector("#select-all")
    const rowChecks = [...document.querySelectorAll(".row-check")]
    const batchExport = document.querySelector("#batch-export")
    const selectionMessage = document.querySelector("#selection-message")
    const updateSelection = () => {
      const selected = rowChecks.filter((checkbox) => checkbox.checked).length
      if (batchExport) batchExport.disabled = selected === 0
      if (selectionMessage)
        selectionMessage.textContent = selected === 0 ? "未选择档案" : `已选择 ${selected} 份档案`
      if (selectAll) {
        selectAll.checked = selected === rowChecks.length && selected > 0
        selectAll.indeterminate = selected > 0 && selected < rowChecks.length
      }
    }
    if (selectAll) {
      selectAll.addEventListener("change", () => {
        rowChecks.forEach((checkbox) => {
          checkbox.checked = selectAll.checked
        })
        updateSelection()
      })
    }
    rowChecks.forEach((checkbox) => {
      checkbox.addEventListener("change", updateSelection)
    })
    if (batchExport)
      batchExport.addEventListener("click", () => showToast("已创建所选档案的 ZIP 导出任务"))

    viewRoot.querySelectorAll("[data-section]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = document.getElementById(button.dataset.section)
        if (target)
          target.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "auto"
              : "smooth",
            block: "start",
          })
        viewRoot.querySelectorAll("[data-section]").forEach((item) => {
          item.classList.toggle("active", item.dataset.section === button.dataset.section)
        })
      })
    })
    const revealButton = document.querySelector("#reveal-value")
    const identityValue = document.querySelector("#identity-value")
    if (revealButton && identityValue) {
      revealButton.addEventListener("click", () => {
        const revealed = revealButton.textContent === "隐藏"
        identityValue.textContent = revealed ? "1101***********123" : "原型不展示完整敏感值"
        revealButton.textContent = revealed ? "显示" : "隐藏"
      })
    }
  }

  function selectView(view) {
    renderView(view)
    document.querySelectorAll(".primary-nav [data-view]").forEach((button) => {
      const navView = view === "detail" ? "people" : view
      const active = button.dataset.view === navView
      button.classList.toggle("active", active)
      button.setAttribute("aria-current", active ? "page" : "false")
    })
    document.querySelectorAll(".secondary-directory [data-view]").forEach((button) => {
      const contextView = view === "detail" ? "people" : view
      button.classList.toggle("active", button.dataset.view === contextView)
    })
  }

  function showToast(message) {
    const toast = document.querySelector("#toast")
    toast.textContent = message
    toast.classList.add("visible")
    window.clearTimeout(toastTimer)
    toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 2400)
  }

  document
    .querySelectorAll(".primary-nav [data-view], .context-rail [data-view]")
    .forEach((button) => {
      button.addEventListener("click", () => selectView(button.dataset.view))
    })
  document.querySelectorAll("[data-toast]").forEach((button) => {
    button.addEventListener("click", () => showToast(button.dataset.toast))
  })
  document.querySelectorAll("[data-action='open-detail']").forEach((button) => {
    button.addEventListener("click", () => selectView("detail"))
  })

  renderView("people")
})()
