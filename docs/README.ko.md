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

```bash
curl -fsSL https://zettel.vincentjang.dev | bash
```

### 요구사항

- Linux (x64, arm64) 또는 macOS (x64, arm64)

### 수동 설치

[Releases](https://github.com/JangVincent/zettelkasten-cli/releases)에서 바이너리 다운로드 후:

```bash
chmod +x zettel-*
sudo mv zettel-* /usr/local/bin/zettel
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
zettel promote fl:250129:1
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

모든 명령어는 인자 없이 실행하면 **인터랙티브 모드**로 동작합니다.

## 데이터 저장

- 경로: `~/.zettel/zettel.db` (SQLite)
- Full-Text Search 지원 (FTS5)
- 모든 변경사항 히스토리 기록

## 기술 스택

- **런타임**: [Bun](https://bun.sh)
- **언어**: TypeScript
- **CLI**: [@clack/prompts](https://github.com/bombshell-dev/clack)
- **저장**: bun:sqlite (내장 SQLite)
- **검색**: SQLite FTS5

## 개발

```bash
# 의존성 설치
bun install

# 개발 실행
bun run dev

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
