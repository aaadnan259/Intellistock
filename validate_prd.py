from pathlib import Path

# Config
PROJECT_ROOT = Path(r"c:\Users\aaadn\Downloads\Projects\Intellistock")
PRD_PATH = Path(
    r"c:\Users\aaadn\.gemini\antigravity\brain\73d7bdcc-e88d-4cd7-8690-"
    r"12b4114eda9a\PROJECT_ANALYSIS_PRD.md"
)

IGNORE_DIRS = {
    ".git",
    ".venv",
    "node_modules",
    "__pycache__",
    ".pytest_cache",
    "dist",
    "build",
    ".idea",
    ".vscode",
    ".agent",
    ".shared",
}
IGNORE_EXTS = {
    ".pyc",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".ico",
    ".svg",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".map",
    ".css.map",
    ".js.map",
}


def get_all_files(root):
    file_list = []
    for path in root.rglob("*"):
        if path.is_file():
            # Check ignores
            parts = path.relative_to(root).parts
            if any(p in IGNORE_DIRS for p in parts):
                continue
            if path.suffix in IGNORE_EXTS:
                continue
            file_list.append(path.relative_to(root).as_posix())
    return sorted(file_list)


def parse_prd(prd_path):
    if not prd_path.exists():
        return ""
    return prd_path.read_text(encoding="utf-8")


def check_coverage(files, prd_content):
    missing_files = []
    covered_files = []

    # Normalize PRD content for search (e.g. replace backslashes)
    # prd_lower = prd_content.lower()

    for f in files:
        # We look for the filename or path in the PRD headers or catalog
        # A simple check is if the filename appears in a header context
        # e.g. "#### `backend/inventory/models.py`"

        # Search patterns
        # 1. Exact path reference: `path/to/file`
        # 2. Header reference: #### `...file.ext`

        fname = f
        if (
            f"/{fname}`" in prd_content
            or f"`{fname}`" in prd_content
            or fname in prd_content
        ):
            # Check if it has a section (approximation)
            if f"#### `{fname}`" in prd_content or f"#### {fname}" in prd_content:
                covered_files.append(f)
            elif f"#### `backend/{fname}`" in prd_content:  # path adjustment
                covered_files.append(f)
            elif f"#### `frontend/{fname}`" in prd_content:
                covered_files.append(f)
            else:
                # It might be mentioned but not documented
                # For the strict audit, we require a section header
                missing_files.append(f)
        else:
            missing_files.append(f)

    return covered_files, missing_files


def main():
    print("Starting PRD Validation Audit...")

    files = get_all_files(PROJECT_ROOT)
    print(f"Total Source Code Files Found: {len(files)}")

    prd_content = parse_prd(PRD_PATH)
    if not prd_content:
        print("CRITICAL ERROR: PRD Artifact not found!")
        return

    covered, missing = check_coverage(files, prd_content)

    print("\nAudit Results:")
    print(f"Verified Documented Files: {len(covered)}")
    print(f"Missing/Undocumented Files: {len(missing)}")
    print(f"Coverage: {len(covered)/len(files)*100:.1f}%")

    if missing:
        print(
            "\nCRITICAL: The following files are missing detailed documentation in the PRD:"
        )
        for m in missing[:20]:  # Show top 20
            print(f" - {m}")
        if len(missing) > 20:
            print(f" ... and {len(missing)-20} more.")

    # Generate Report
    report = "# PRD Validation Scorecard\n\n"
    report += f"- **Total Files Scanned**: {len(files)}\n"
    report += f"- **Documented**: {len(covered)}\n"
    report += f"- **Missing**: {len(missing)}\n"
    report += f"- **Coverage Score**: {len(covered)/len(files)*100:.1f}%\n\n"

    report += "## Missing Files Audit\n"
    for m in missing:
        report += f"- [ ] {m}\n"

    with open("validation_report.md", "w", encoding="utf-8") as f:
        f.write(report)

    print("\nValidation report generated: validation_report.md")


if __name__ == "__main__":
    main()
