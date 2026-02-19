# GFM Table 지원 구현 기록

## 날짜: 2026-02-20

## 배경

사용자가 메시지에 GFM pipe table 문법(`| col | col |`)을 입력하면, commonmark 파서가 이를 인식하지 못해 일반 텍스트로 전송되는 문제. 수신측은 이미 HTML `<table>` 렌더링을 지원하므로, 송신 파이프라인에서 변환만 추가하면 됨.

## 구현 방식: 전처리/후처리 패턴

LaTeX 수식 전처리(`feature_latex_maths`)와 동일한 패턴 채택.

### 수정 파일 4개

**1. `src/editor/serialize.ts`** — 송신 시 table → HTML 변환
- `convertGfmTablesToHtml()` 함수 추가 (exported)
- `htmlSerializeFromMdIfNeeded()`에서 `new Markdown(md)` 호출 전에 전처리
- 코드 블록(``` / ~~~) 내부 보호
- separator row의 `:` 패턴으로 text-align 지원
- `escapeHtml()`로 셀 내용 XSS 방지

**2. `src/Markdown.ts`** — table HTML 태그 허용
- `ALLOWED_HTML_TAGS`에 `table, thead, tbody, tr, th, td` 추가
- `isAllowedHtmlTag()`에 table HTML 블록 패턴 인식 (`/^<table>.*<\/table>\s*$/`)
- `<th|td style="text-align:...">` 속성 포함 태그 허용

**3. `src/editor/deserialize.ts`** — 편집 시 HTML → pipe table 복원
- `parseTable()` 함수 추가
- `parseNode()`의 switch문에 `case "TABLE":` 추가
- `<th>` → header row, separator row 자동 생성, `<td>` → body rows
- alignment 속성 → `:---`, `:---:`, `---:` 보존

**4. 테스트 3개 파일**
- `test/unit-tests/Markdown-test.ts` — table HTML이 isPlainText()=false 반환 확인
- `test/unit-tests/editor/serialize-test.ts` — convertGfmTablesToHtml 단위 테스트 + e2e
- `test/unit-tests/editor/deserialize-test.ts` — HTML table → pipe table 역변환 테스트

## 이 방식을 선택한 이유

### commonmark.js 0.31의 한계
- commonmark 스펙 자체에 table이 없음
- commonmark.js는 확장 메커니즘을 제공하지 않음
- GFM table을 AST 레벨에서 처리하려면 파서 교체 필요

### 파서 교체(markdown-it 등)를 하지 않은 이유
- `Markdown.ts`의 `isPlainText()`, `toHTML()`, `toPlaintext()`, `repairLinks()` 전부 재작성 필요
- upstream Element Web과의 divergence가 크게 증가
- 리스크 대비 이득이 불분명

### 전처리 패턴의 타당성
- upstream Element Web이 LaTeX math에서 이미 같은 패턴을 사용 중
- 아키텍처 일관성 유지
- 변경 범위가 작고 격리됨
- fork 유지 비용 최소화

## 알려진 제한사항 및 향후 개선점

### 1. 셀 안의 escaped pipe (`\|`)
- 현재: 셀 내용에 `|` 문자가 있으면 잘못된 column 분리 발생
- 개선: `splitTableRow()`에서 `\|`를 인식하여 리터럴 `|`로 처리

### 2. 셀 안의 마크다운 서식
- 현재: `| **bold** | _italic_ |` → escapeHtml이 원본 텍스트를 그대로 이스케이프
- 개선: 셀 내용에 대해 별도로 마크다운 → HTML 변환 수행

### 3. thead 없는 table
- 현재: `<thead>`가 없는 table HTML은 역변환 시 빈 header 생성
- 개선: thead 없으면 첫 번째 body row를 header로 사용하거나 fallback

### 4. 코드 블록 보호의 edge case
- 현재: fenced code block(``` / ~~~)만 보호
- 개선: indented code block(4스페이스)도 보호 필요할 수 있음

### 5. 다른 클라이언트와의 호환성
- 다른 Matrix 클라이언트에서 보낸 `<table>` HTML 메시지를 편집할 때, 해당 table이 GFM pipe 형식이 아닌 경우 역변환이 완벽하지 않을 수 있음
