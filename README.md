# Tex-Notes 📝⚡

**Tex-Notes** is a minimal, modern, and completely offline \LaTeX{} editor designed for taking university, scientific, and technical notes at lightning speed. It features a real-time live PDF preview, a one-click mathematical command vocabulary, and an embedded offline compilation engine with zero reliance on cloud services or active internet connections.

---

## 🌟 Key Features

- **⚡ Ultra-Responsive Live Preview:** Quiet, automatic background compilation as you type (debounced at 1–2 seconds) paired with high-DPI PDF rendering via PDF.js.
- **🖥️ Smart Responsive Auto-Fit:** The PDF preview automatically resizes to fit the container width as the window is scaled or the split pane is adjusted, preventing horizontal cut-offs on compact screens.
- **📦 Bundled Offline Engine (Tectonic):** Includes and runs [Tectonic](https://tectonic-typesetting.github.io/) locally, providing fast, self-contained compilations without manual TeX distribution setup.
- **🔄 Multi-Engine Compiler Support:** Automatic detection and real-time switching between **Tectonic** and **pdfLaTeX** (system installations such as MiKTeX or TeX Live).
- **📚 Quick Command Vocabulary:** Collapsible sidebar palette containing hundreds of ready-to-insert math symbols, matrices, summations, `booktabs` tables, and document structures.
- **🔍 Log & Error Diagnostics:** Automatic TeX log parser providing exact line numbers, direct navigation to errors, and a dedicated collapsible console panel for easy debugging.
- **💾 Native File Management:** Open, edit, and save `.tex` files locally, or export production-ready `.pdf` documents directly to your filesystem.
- **🎨 Modern Dark UI:** Clean dark theme built with CodeMirror 6 syntax highlighting, draggable split panes, and productive keyboard shortcuts.

---

## 🛠️ Technology Stack

- **Desktop Framework:** [Tauri v2](https://v2.tauri.app/) (lightweight, memory-efficient Rust backend)
- **Frontend:** [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- **Code Editor:** [CodeMirror 6](https://codemirror.net/) with custom \LaTeX{} mode and bracket matching
- **PDF Rendering:** [PDF.js](https://mozilla.github.io/pdf.js/) with HiDPI Canvas support
- **Icons & UI:** [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started & Development

### Prerequisites
1. **Node.js** (v18 or higher)
2. **Rust & Cargo** (installed via [rustup](https://rustup.rs/))
3. **C++ Build Tools** (e.g., Visual Studio C++ Build Tools on Windows)

### Installing Dependencies
```bash
npm install
```

### Run in Browser Mode (Frontend UI Dev)
```bash
npm run dev
```

### Run with Tauri Desktop App
```bash
npm run tauri dev
```

### Build Distribution Package (Windows Installer)
```bash
npm run tauri build
```

---

## 📁 Project Architecture

```text
Tex-Notes/
├── bin/                      # Bundled offline compiler binary (tectonic.exe)
├── src/                      # Frontend React application
│   ├── components/           # UI components (Editor, PdfPreview, TopBar, BottomPanel, etc.)
│   ├── data/                 # Symbol vocabulary dataset and default template
│   ├── services/             # IPC compiler service, file I/O, and update checks
│   ├── types.ts              # Global TypeScript interfaces
│   ├── App.tsx               # Main layout and application state orchestrator
│   └── main.tsx              # React DOM entry point
├── src-tauri/                # Native Rust backend
│   ├── src/
│   │   ├── commands.rs       # Tauri IPC commands exposed to the frontend
│   │   ├── compiler.rs       # Compilation runner (Tectonic/pdfLaTeX) and log parsers
│   │   ├── file_ops.rs       # Native filesystem operations
│   │   ├── lib.rs            # Tauri builder configuration
│   │   └── main.rs           # Native application entry point
│   └── tauri.conf.json       # Tauri window, security, and bundle configuration
└── package.json              # Node.js scripts and dependencies
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + S` | Save current `.tex` file |
| `Ctrl + O` | Open an existing `.tex` file |
| `F5` / `Ctrl + Enter` | Force manual compilation |
| `Ctrl + F` | Search inside the code editor |
| `Ctrl + H` | Search and replace inside the editor |

---

## 💡 Quick Guide: \LaTeX{} Math Syntax

In \LaTeX{}, mathematical commands (such as fractions `\frac`, summations `\sum`, and Greek symbols `\alpha`) **must** be placed inside a mathematical environment (*math mode*):

### Inline Math (Inside Running Text)
Enclose the expression within dollar signs `$...$`:
```latex
The fraction evaluates to $\frac{a+b}{c}$ whenever $c \neq 0$.
```

### Display Math (Centered Standalone Equation)
Use `\[ ... \]` or the `equation` environment:
```latex
\[
\frac{a+b}{c}
\]
```
or with automatic equation numbering:
```latex
\begin{equation}
    f(x) = \frac{a+b}{c}
\end{equation}
```

> **Note:** If you write `\frac{a+b}{c}` directly as plain text outside math delimiters, the compiler will trigger a `\frac allowed only in math mode` warning. Under continuous compilation mode, this results in misplaced lines and misaligned text fonts.

---

## 📄 License

Distributed under the [MIT](LICENSE) License.

**Tex-Notes** is a minimal, modern, and completely offline \LaTeX{} editor designed for taking university, scientific, and technical notes at lightning speed. It features a real-time live PDF preview, a one-click mathematical command vocabulary, and an embedded offline compilation engine with zero reliance on cloud services or active internet connections.

---

## 🌟 Key Features

- **⚡ Ultra-Responsive Live Preview:** Quiet, automatic background compilation as you type (debounced at 1–2 seconds) paired with high-DPI PDF rendering via PDF.js.
- **🖥️ Smart Responsive Auto-Fit:** The PDF preview automatically resizes to fit the container width as the window is scaled or the split pane is adjusted, preventing horizontal cut-offs on compact screens.
- **📦 Bundled Offline Engine (Tectonic):** Includes and runs [Tectonic](https://tectonic-typesetting.github.io/) locally, providing fast, self-contained compilations without manual TeX distribution setup.
- **🔄 Multi-Engine Compiler Support:** Automatic detection and real-time switching between **Tectonic** and **pdfLaTeX** (system installations such as MiKTeX or TeX Live).
- **📚 Quick Command Vocabulary:** Collapsible sidebar palette containing hundreds of ready-to-insert math symbols, matrices, summations, `booktabs` tables, and document structures.
- **🔍 Log & Error Diagnostics:** Automatic TeX log parser providing exact line numbers, direct navigation to errors, and a dedicated collapsible console panel for easy debugging.
- **💾 Native File Management:** Open, edit, and save `.tex` files locally, or export production-ready `.pdf` documents directly to your filesystem.
- **🎨 Modern Dark UI:** Clean dark theme built with CodeMirror 6 syntax highlighting, draggable split panes, and productive keyboard shortcuts.

---

## 🛠️ Technology Stack

- **Desktop Framework:** [Tauri v2](https://v2.tauri.app/) (lightweight, memory-efficient Rust backend)
- **Frontend:** [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- **Code Editor:** [CodeMirror 6](https://codemirror.net/) with custom \LaTeX{} mode and bracket matching
- **PDF Rendering:** [PDF.js](https://mozilla.github.io/pdf.js/) with HiDPI Canvas support
- **Icons & UI:** [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started & Development

### Prerequisites
1. **Node.js** (v18 or higher)
2. **Rust & Cargo** (installed via [rustup](https://rustup.rs/))
3. **C++ Build Tools** (e.g., Visual Studio C++ Build Tools on Windows)

### Installing Dependencies
```bash
npm install
```

### Run in Browser Mode (Frontend UI Dev)
```bash
npm run dev
```

### Run with Tauri Desktop App
```bash
npm run tauri dev
```

### Build Distribution Package (Windows Installer)
```bash
npm run tauri build
```

---

## 📁 Project Architecture

```text
Tex-Notes/
├── bin/                      # Bundled offline compiler binary (tectonic.exe)
├── src/                      # Frontend React application
│   ├── components/           # UI components (Editor, PdfPreview, TopBar, BottomPanel, etc.)
│   ├── data/                 # Symbol vocabulary dataset and default template
│   ├── services/             # IPC compiler service, file I/O, and update checks
│   ├── types.ts              # Global TypeScript interfaces
│   ├── App.tsx               # Main layout and application state orchestrator
│   └── main.tsx              # React DOM entry point
├── src-tauri/                # Native Rust backend
│   ├── src/
│   │   ├── commands.rs       # Tauri IPC commands exposed to the frontend
│   │   ├── compiler.rs       # Compilation runner (Tectonic/pdfLaTeX) and log parsers
│   │   ├── file_ops.rs       # Native filesystem operations
│   │   ├── lib.rs            # Tauri builder configuration
│   │   └── main.rs           # Native application entry point
│   └── tauri.conf.json       # Tauri window, security, and bundle configuration
└── package.json              # Node.js scripts and dependencies
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + S` | Save current `.tex` file |
| `Ctrl + O` | Open an existing `.tex` file |
| `F5` / `Ctrl + Enter` | Force manual compilation |
| `Ctrl + F` | Search inside the code editor |
| `Ctrl + H` | Search and replace inside the editor |

---

## 💡 Quick Guide: \LaTeX{} Math Syntax

In \LaTeX{}, mathematical commands (such as fractions `\frac`, summations `\sum`, and Greek symbols `\alpha`) **must** be placed inside a mathematical environment (*math mode*):

### Inline Math (Inside Running Text)
Enclose the expression within dollar signs `$...$`:
```latex
The fraction evaluates to $\frac{a+b}{c}$ whenever $c \neq 0$.
```

### Display Math (Centered Standalone Equation)
Use `\[ ... \]` or the `equation` environment:
```latex
\[
\frac{a+b}{c}
\]
```
or with automatic equation numbering:
```latex
\begin{equation}
    f(x) = \frac{a+b}{c}
\end{equation}
```

> **Note:** If you write `\frac{a+b}{c}` directly as plain text outside math delimiters, the compiler will trigger a `\frac allowed only in math mode` warning. Under continuous compilation mode, this results in misplaced lines and misaligned text fonts.

---

## 📄 License

Distributed under the [MIT](LICENSE) License.
