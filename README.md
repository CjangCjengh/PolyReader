# PolyReader

Android 本地 EPUB / TXT 阅读器。

- BOOK☆WALKER、RIDI 两种阅读器，各自保存设置与阅读位置。
- 网格书架、共享配色、音量键翻页、目录、搜索、书签和笔记。
- 支持 UTF-8、UTF-16 及常见中日韩文本编码。
- 自适应应用图标，支持圆形和主题配色。

安装要求：Android 10+、arm64、WebView 110+。当前为调试构建；原应用部分高级功能与设置页面仍待完善。

书架右上角 `+` 导入书籍，打开时选择阅读器。轻触正文中央显示菜单。

构建需要 JDK 21、Android SDK 34。配置 `JAVA_HOME` 和 `ANDROID_HOME`，在项目根目录运行：

```powershell
.\build.ps1
```

第三方组件见 [THIRD_PARTY.md](THIRD_PARTY.md)。
