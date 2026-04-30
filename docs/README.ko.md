# zettel

터미널 기반 제텔카스텐 지식 관리 시스템

[English](../README.md)

## 철학

> *"위치가 아니라 연결이 중요하다"*

이 프로젝트는 Niklas Luhmann의 제텔카스텐 방법론을 터미널에서 구현합니다.

**폴더 기반 분류가 아닌 연결 기반 지식 관리**를 지향합니다. 노트를 어디에 "넣을지" 고민하는 대신, 어떤 아이디어와 "연결되는지"에 집중합니다.

노트 타입 분류는 Sönke Ahrens의 *"How to Take Smart Notes"* (2017)에서 체계화한 현대적 해석을 따릅니다:

| 타입 | 설명 |
|------|------|
| **Fleeting** | 순간적 메모. 며칠 내 Zettel로 승격하거나 삭제 |
| **Literature** | 외부 자료를 자기 말로 이해한 내용. 출처 포함 |
| **Zettel** | 원자적 아이디어. 제텔카스텐의 핵심 |

```
[Fleeting] ──승격──→ [Zettel] ←──파생── [Literature]
                        ↕
                    [Zettel]
```

### ID 시스템

루만 방식 영숫자 ID를 사용합니다. ID 자체가 파생 관계를 나타냅니다:

```
1       첫 번째 카드
1a      1에서 파생된 아이디어
1a1     1a에서 다시 파생
1b      1의 두 번째 파생
2       완전히 새로운 주제
```

### 연결

- **links**: Zettel ↔ Zettel 간 연결 (이유 필수: 지지, 반박, 확장, 대조, 질문)
- **references**: Zettel → Literature 참조 (출처 표기)

## 설치

### Homebrew (macOS/Linux 권장)

```bash
brew tap JangVincent/tap
brew install zettel
```

### 셸 스크립트

```bash
curl -fsSL https://zettel.vincentjang.dev | bash
```

### 요구사항

- Linux (x64, arm64) 또는 macOS (x64, arm64)

### 수동 설치

[Releases](https://github.com/JangVincent/zettelkasten-cli/releases)에서 바이너리 다운로드 후:

```bash
mkdir -p ~/.zettel/bin
chmod +x zettel-*
mv zettel-* ~/.zettel/bin/zettel

# PATH에 추가 (~/.bashrc 또는 ~/.zshrc에 추가)
export PATH="$PATH:$HOME/.zettel/bin"
```

### 삭제

```bash
zettel self-delete
# 또는 수동으로:
rm -rf ~/.zettel
```

## 빠른 시작

```bash
# 초기화
zettel init

# 새 노트 생성 (인터랙티브)
zettel new

# 노트 목록
zettel list

# 노트 보기
zettel show 1a

# 검색
zettel search "entity"

# 연결
zettel link 1a 2b

# Fleeting → Zettel 승격
zettel promote fl:1
```

## 명령어

| 명령어 | 설명 |
|--------|------|
| `zettel init` | 초기화 |
| `zettel new` | 새 노트 생성 |
| `zettel list` | 노트 목록 |
| `zettel show <id>` | 노트 상세 보기 |
| `zettel edit <id>` | 노트 편집 |
| `zettel delete <id>` | 노트 삭제 |
| `zettel link <src> <tgt>` | 노트 연결 |
| `zettel unlink <src> <tgt>` | 연결 해제 |
| `zettel promote <id>` | Fleeting → Zettel 승격 |
| `zettel search <query>` | 검색 |
| `zettel index <subcmd>` | 인덱스 관리 |
| `zettel tree <id>` | 연결 트리 시각화 |
| `zettel history` | 변경 히스토리 |
| `zettel dangling` | 끊어진 링크 조회 |
| `zettel config` | 설정 관리 |
| `zettel export` | 마크다운 내보내기 |
| `zettel web` | 웹 UI 실행 |
| `zettel update` | 최신 버전으로 업데이트 |
| `zettel --version` | 버전 확인 |

모든 명령어는 인자 없이 실행하면 **인터랙티브 모드**로 동작합니다.

## 웹 UI

그래픽 인터페이스를 선호하는 사용자를 위한 웹 기반 UI를 제공합니다.

```bash
zettel web              # 기본 포트 3001에서 시작
zettel web -p 8080      # 커스텀 포트 지정
```

브라우저에서 `http://localhost:3001`을 엽니다.

### 기능

- **그래프 뷰**: 노트 연결의 인터랙티브 네트워크 시각화 (Cytoscape.js)
- **노트 관리**: Zettel, Fleeting, Literature 노트 생성/편집/삭제
- **연결 관리**: 관계 유형과 함께 연결 생성 및 제거
- **인덱스 카드**: 인덱스 카드로 노트 정리
- **검색**: 제목과 ID로 실시간 필터링
- **히스토리**: 액션 유형별 변경 이력 조회
- **듀얼 뷰 모드**: 카드 그리드 또는 리스트 테이블 뷰

## 데이터 저장

모든 데이터는 `~/.zettel/`에 저장됩니다:

```
~/.zettel/
├── bin/zettel      # 바이너리
├── web-dist/       # 웹 UI 정적 파일
└── zettel.db       # SQLite 데이터베이스
```

- Full-Text Search 지원 (FTS5)
- 모든 변경사항 히스토리 기록
- `ZETTEL_HOME` 환경변수로 경로 변경 가능

## 내보내기

```bash
zettel export                     # 기본 경로
zettel export -o ~/backup/zettel  # 커스텀 경로
```

기본 내보내기 경로: `~/Documents/zettel/{yymmdd_HHmmss}/`

```
~/Documents/zettel/250129_143042/
├── fleeting/
├── literature/
└── zettel/
```

## 알려진 제한사항

**유니코드 표시**: ZWJ (Zero Width Joiner) 이모지 시퀀스(예: 👨‍👩‍👧‍👦)는 터미널 박스에서 정렬이 맞지 않을 수 있습니다. 표시 너비는 터미널 에뮬레이터마다 다릅니다. 일반 이모지(🎉), CJK 문자(한글/中文/日本語), 아랍어/히브리어는 지원됩니다.

## 기술 스택

- **런타임**: [Bun](https://bun.sh)
- **언어**: TypeScript
- **CLI**: [@clack/prompts](https://github.com/bombshell-dev/clack)
- **저장**: bun:sqlite (내장 SQLite)
- **검색**: SQLite FTS5
- **웹 UI**: React, Vite, Tailwind CSS, Radix UI, Cytoscape.js

## 개발

```bash
# 의존성 설치
bun install

# 개발 실행
bun run dev

# 웹 UI 개발 (API + Vite)
bun run dev:web

# 빌드
bun run build

# 테스트
bun test
```

### 아키텍처

Repository 패턴 + DDD를 적용하여 도메인과 인프라를 분리:

```
src/
├── domain/           # 비즈니스 로직 (DB 의존성 없음)
├── infra/sqlite/     # bun:sqlite 기반 Repository 구현
├── commands/         # CLI 명령어
├── i18n/             # 다국어 지원 (en-US, ko-KR)
└── utils/            # 유틸리티
```

## 라이선스

MIT
