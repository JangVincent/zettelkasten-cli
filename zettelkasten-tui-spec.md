# Zettelkasten TUI

터미널 기반 제텔카스텐 지식 관리 시스템

## 개요

Niklas Luhmann의 제텔카스텐 방법론을 터미널에서 사용할 수 있는 TUI 앱.
폴더 기반 분류가 아닌 **연결 기반** 지식 관리를 목표로 한다.

노트 타입 분류(fleeting/literature/permanent)는 Sönke Ahrens의 
*"How to Take Smart Notes"* (2017)에서 체계화한 현대적 해석을 따른다.

## 기술 스택

- **런타임**: Bun
- **언어**: TypeScript
- **CLI 프롬프트**: @clack/prompts
- **저장 방식**: Bun 내장 SQLite ([bun:sqlite](https://bun.sh/docs/api/sqlite))
- **검색**: SQLite FTS5 (다국어 Full-Text Search)
- **내보내기**: 마크다운 (export/backup용)

### 아키텍처 가이드

**Repository 패턴 + DDD 적용**

향후 서비스 확장(ORM 변경, 다른 DB 지원 등)을 고려하여 도메인과 인프라를 분리:

```
src/
├── domain/           # 비즈니스 로직 (DB 의존성 없음)
│   ├── entities/     # Zettel, FleetingNote, LiteratureNote, IndexCard
│   └── repositories/ # Repository 인터페이스
├── infra/            # 인프라 구현
│   └── sqlite/       # bun:sqlite 기반 Repository 구현
└── commands/         # CLI 명령어 (UseCase 호출)
```

**핵심 원칙**:
- Domain 레이어는 `bun:sqlite`에 직접 의존하지 않음
- Repository 인터페이스를 통해 데이터 접근 추상화
- 추후 ORM(Drizzle, Prisma 등) 또는 다른 DB로 교체 가능

## 핵심 개념

### 노트 타입 (Sönke Ahrens 용어)

| 타입 | 설명 |
|------|------|
| **Fleeting Notes** | 순간적 메모, 임시 아이디어 캡처. **며칠 내 Zettel로 승격하거나 삭제** |
| **Literature Notes** | 외부 자료를 **자기 말로** 이해한 내용 정리 (원문 복사 ✗), 출처 포함 |
| **Zettel (Permanent Notes)** | 원자적 아이디어, 제텔카스텐의 핵심 |

### 노트 간 관계

```
[Fleeting] ──승격──→ [Zettel]
                        ↑
[Literature] ──파생──→ [Zettel]
```

- **Fleeting**: 빠르게 캡처 → **며칠 내 검토** → Zettel로 승격하거나 삭제
- **Literature**: 외부 자료를 **자기 말로 이해**하여 정리 → 내 생각이 파생되면 Zettel 생성
- **Zettel**: 최종 형태, 서로 연결되어 지식 네트워크 형성

**참조 방향**: Zettel이 Literature를 출처로 참조 (references 필드에 저장)

### ID 시스템

**Zettel**: 루만 방식 영숫자 ID (숫자로 시작 필수)

```
1       첫 번째 카드
1a      1에서 파생된 아이디어
1a1     1a에서 다시 파생
1a2     1a의 또 다른 파생
1b      1의 두 번째 파생
2       완전히 새로운 주제
```

- **숫자로 시작**, 이후 숫자/영문자 교차 (예: `1`, `1a`, `1a1`, `12b3`)
- ID는 **파생 관계**를 나타냄 (ID 자체에 포함, 별도 링크 아님)
- 유저가 직접 결정하되, 앱이 다음 번호를 **제안**함
- ID, 연결은 언제든 변경 가능 (불변은 내용뿐)
- **중복 ID 입력 시 에러** → 다시 입력 요청

**Fleeting**: `fl:yymmdd:id`

```
fl:250129:1           # 자동 증가 (입력 안 함)
fl:250129:2
fl:250129:idea1       # 유저 입력
```

- prefix `fl:yymmdd:`는 시스템이 자동 추가
- 유저는 마지막 부분만 입력 (생략 시 자연수 자동 증가, pad 0 없음)
- **중복 ID 입력 시 에러** → 다시 입력 요청

**Literature**: `lit:id` (유저 입력 필수)

```
lit:evans-ddd-ch3
lit:fowler-refactoring
```

- prefix `lit:`는 시스템이 자동 추가
- 유저가 나머지 ID 직접 입력 (자동 생성 없음)
- **중복 ID 입력 시 에러** → 다시 입력 요청

### 연결 (Links)

- **links**: Zettel ↔ Zettel 간 연결
  - 단방향 (A가 B를 참조)
  - **Outgoing**: 이 카드에서 다른 Zettel로 나가는 연결
  - **Incoming**: 다른 Zettel에서 이 카드로 들어오는 연결 (인덱스 조회)
  - 연결 시 **이유 필수**: 지지, 반박, 확장, 대조, 질문 또는 직접 입력
  - 빈 배열 허용, 나중에 추가 가능

- **references**: Zettel → Literature 참조
  - 출처 표기용, 별도 테이블로 관리
  - reason 없음 (출처는 이유가 자명)
  - Literature 입장에서 역참조도 인덱스 조회

### 인덱스 카드

- 특정 주제의 진입점 역할
- 관련 카드 ID들을 나열
- 나중에 찾기 위한 목차
- `show` 명령어에서 해당 카드가 속한 인덱스 표시

## 파일 구조

### 디렉토리

```
~/.zettel/
└── zettel.db          # Bun SQLite 데이터베이스 (source of truth)

# Export 시 (기본 경로)
~/Documents/zettel/${yymmdd_HHmmss}/
├── fleeting/
├── literature/
└── zettel/
```

### 데이터 스키마

**SQLite 테이블 구조**

```sql
-- Fleeting 노트
CREATE TABLE fleeting_notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Literature 노트
CREATE TABLE literature_notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Zettel (Permanent 노트)
CREATE TABLE zettels (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Zettel 간 연결 (outgoing)
CREATE TABLE links (
  source_id TEXT NOT NULL,
  target_id TEXT,                -- nullable (삭제된 카드 참조 허용)
  reason TEXT NOT NULL,
  PRIMARY KEY (source_id, target_id),
  FOREIGN KEY (source_id) REFERENCES zettels(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (target_id) REFERENCES zettels(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Zettel → Literature 참조
CREATE TABLE references (
  zettel_id TEXT NOT NULL,
  literature_id TEXT,            -- nullable (삭제된 Literature 참조 허용)
  PRIMARY KEY (zettel_id, literature_id),
  FOREIGN KEY (zettel_id) REFERENCES zettels(id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (literature_id) REFERENCES literature_notes(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- 인덱스 카드
CREATE TABLE indexes (
  name TEXT PRIMARY KEY
);

-- 인덱스 엔트리 (Zettel만 인덱싱)
CREATE TABLE index_entries (
  index_name TEXT NOT NULL,
  zettel_id TEXT NOT NULL,
  label TEXT,
  PRIMARY KEY (index_name, zettel_id),
  FOREIGN KEY (index_name) REFERENCES indexes(name) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (zettel_id) REFERENCES zettels(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 설정
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 히스토리 (모든 변경 추적)
CREATE TABLE history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,           -- CREATE, UPDATE, DELETE, LINK, UNLINK
  target_type TEXT NOT NULL,      -- fleeting, literature, zettel, link, reference, index
  target_id TEXT NOT NULL,
  old_value TEXT,                 -- JSON (변경 전, nullable)
  new_value TEXT,                 -- JSON (변경 후, nullable)
  created_at TEXT NOT NULL
);

CREATE INDEX idx_history_created ON history(created_at DESC);

-- 기본 설정
INSERT INTO settings (key, value) VALUES ('language', 'en-US');

-- 인덱스 (성능용)
CREATE INDEX idx_links_target ON links(target_id);  -- incoming 조회용
CREATE INDEX idx_refs_literature ON references(literature_id);  -- 역참조용

-- Full-Text Search (다국어 지원)
CREATE VIRTUAL TABLE fts_fleeting USING fts5(id, title, content);
CREATE VIRTUAL TABLE fts_literature USING fts5(id, title, content, source);
CREATE VIRTUAL TABLE fts_zettel USING fts5(id, title, content);

-- FTS 동기화: 앱 레벨 트랜잭션으로 처리
-- INSERT/UPDATE/DELETE 시 원본 테이블과 FTS 테이블을 같은 트랜잭션에서 처리
```

**TypeScript 인터페이스**

```typescript
interface FleetingNote {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

interface LiteratureNote {
  id: string;
  title: string;
  content: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Zettel {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Link {
  sourceId: string;
  targetId: string | null;      // null if target deleted (dangling)
  reason: string;
}

interface Reference {
  zettelId: string;
  literatureId: string | null;  // null if literature deleted (dangling)
}

interface IndexCard {
  name: string;
  entries: IndexEntry[];
}

interface IndexEntry {
  zettelId: string;
  label?: string;
}

interface HistoryEntry {
  id: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LINK' | 'UNLINK';
  targetType: 'fleeting' | 'literature' | 'zettel' | 'link' | 'reference' | 'index';
  targetId: string;
  oldValue: string | null;        // JSON
  newValue: string | null;        // JSON
  createdAt: Date;
}
```

### FTS 동기화 + 히스토리 기록

노트 생성/수정/삭제 시 원본 테이블, FTS 테이블, 히스토리를 **같은 트랜잭션**에서 처리:

```typescript
import { Database } from "bun:sqlite";

const db = new Database("~/.zettel/zettel.db");

// 생성 예시
db.transaction(() => {
  db.run("INSERT INTO zettels (...) VALUES (...)", [...]);
  db.run("INSERT INTO fts_zettel (...) VALUES (...)", [...]);
  db.run("INSERT INTO history (action, target_type, target_id, new_value, created_at) VALUES (?, ?, ?, ?, ?)",
    ["CREATE", "zettel", id, JSON.stringify({ title, content }), new Date().toISOString()]);
})();

// 수정 예시
db.transaction(() => {
  const old = db.query("SELECT * FROM zettels WHERE id = ?").get(id);
  db.run("UPDATE zettels SET title = ?, content = ? WHERE id = ?", [title, content, id]);
  db.run("DELETE FROM fts_zettel WHERE id = ?", [id]);
  db.run("INSERT INTO fts_zettel (...) VALUES (...)", [...]);
  db.run("INSERT INTO history (action, target_type, target_id, old_value, new_value, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    ["UPDATE", "zettel", id, JSON.stringify(old), JSON.stringify({ title, content }), new Date().toISOString()]);
})();

// 삭제 예시
db.transaction(() => {
  const old = db.query("SELECT * FROM zettels WHERE id = ?").get(id);
  db.run("DELETE FROM zettels WHERE id = ?", [id]);
  db.run("DELETE FROM fts_zettel WHERE id = ?", [id]);
  db.run("INSERT INTO history (action, target_type, target_id, old_value, created_at) VALUES (?, ?, ?, ?, ?)",
    ["DELETE", "zettel", id, JSON.stringify(old), new Date().toISOString()]);
})();
```

**참고**: 실제 구현 시 Repository 패턴으로 추상화하여 DB 접근 로직 캡슐화

**장점**: 원자성 보장, 명시적 제어, 디버깅 용이

### Export 포맷 (마크다운)

`zettel export` 명령어로 마크다운 파일로 내보낼 수 있다.

**폴더 구조**
```
~/Documents/zettel/250129_153042/
├── fleeting/
│   └── fl-250129_1.md
├── literature/
│   └── lit_evans-ddd-ch3.md
└── zettel/
    └── 1a1.md
```

**Fleeting** (`fleeting/fl-250129_1.md`)
```markdown
---
id: fl:250129:1
title: DDD에서 Aggregate 경계가 중요한 이유?
created: 2025-01-29T10:00:00Z
updated: 2025-01-29T10:00:00Z
---

트랜잭션 범위랑 관련 있을 것 같은데...
```

**Literature** (`literature/lit_evans-ddd-ch3.md`)
```markdown
---
id: lit:evans-ddd-ch3
title: Evans DDD - Entity 정의
source: "Eric Evans, Domain-Driven Design, Chapter 3, p.89"
created: 2025-01-29T10:00:00Z
updated: 2025-01-29T10:00:00Z
---

에반스는 Entity를 "연속성과 식별자로 정의되는 객체"라고 
설명한다. 속성이 바뀌어도 같은 Entity다.
```

**Zettel** (`zettel/1a1.md`)
```markdown
---
id: 1a1
title: Entity는 식별자로 구분된다
links: "1a:파생,3b:반박"
references: "lit:evans-ddd-ch3,lit:fowler-refactoring-ch2"
created: 2025-01-29T10:00:00Z
updated: 2025-01-29T10:00:00Z
---

Entity는 식별자(identity)로 구분되는 객체다.
같은 속성을 가져도 ID가 다르면 다른 Entity다.

이건 DB의 PK 개념이랑 비슷하지만, DDD에서는 
도메인 관점의 식별자를 말하는 거다.
기술적 ID와 비즈니스 ID는 다를 수 있다.
```

## 명령어 체계

**기본 원칙**
- 인자/플래그 없이 실행하면 **인터랙티브 모드** (clack 프롬프트)
- 플래그로 값을 주면 해당 프롬프트 **스킵**
- 스크립팅/자동화 지원

---

### `zettel init`

Zettelkasten 초기화

**동작**
1. `~/.zettel/` 디렉토리 생성
2. `zettel.db` SQLite 데이터베이스 생성
3. 테이블 스키마 초기화
4. 언어 설정

**플래그**

| 플래그 | 축약 | 값 | 설명 |
|--------|------|-----|------|
| `--path` | `-p` | path | 커스텀 경로 (기본: `~/.zettel/`) |
| `--lang` | `-l` | `ko-KR`, `en-US` | 언어 설정 (기본: 프롬프트) |

**예시**
```bash
zettel init                     # 인터랙티브 (언어 선택)
zettel init -l ko-KR            # 한국어로 바로 초기화
zettel init -p ~/my-zettel      # 커스텀 경로
```

**인터랙티브 플로우**
```
◆ 언어 선택 / Select language
│ ● English (en-US)
│ ○ 한국어 (ko-KR)
│
◆ Initializing Zettelkasten...
✓ Directory created: ~/.zettel/
✓ Database created: ~/.zettel/zettel.db
✓ Initialization complete!

To start: zettel new
```

**주의**: 이미 존재하면 경고 후 스킵 (덮어쓰기 안 함)

**미초기화 시 다른 명령어 실행**
```
$ zettel new

✗ Zettelkasten is not initialized.
  Run first: zettel init
```

---

### `zettel new`

새 노트 생성

**플래그**

| 플래그 | 축약 | 값 | 설명 |
|--------|------|-----|------|
| `--type` | `-t` | `fleeting`, `literature`, `zettel` | 노트 타입 |
| `--parent` | `-p` | ID | 파생 원본 카드 (zettel 타입만) |
| `--title` | `-T` | string | 제목 |
| `--source` | `-s` | string | 출처 (literature 타입만) |

**예시**
```bash
zettel new                              # 인터랙티브
zettel new -t fleeting                  # fleeting 바로 생성
zettel new -t zettel -p 1a              # 1a에서 파생
zettel new -t literature -s "Evans DDD p.89"
```

**인터랙티브 플로우**
```
◆ 어떤 타입의 노트인가요?
│ ○ fleeting
│ ○ literature  
│ ● zettel
│
◆ 기존 카드에서 파생된 생각인가요?
│ ○ 아니오, 새로운 아이디어
│ ● 예, 기존 카드에서
│
◆ 어떤 카드에서 파생? (검색)
│ > entity
│   1a  Entity 정의
│   1a1 Entity는 식별자로 구분된다
│ 
◆ 1a1 선택됨. 제안 ID: 1a1a
│ (Enter로 확인, 또는 직접 입력)
│ > _
│
◆ 제목
│ > Value Object와의 차이점
│
◆ 내용 (외부 에디터에서 작성)
│ [$EDITOR 실행]
│
◆ 연결할 카드가 있나요? (Y/n)
│ > Y
│
┌─ 연결 추가 루프 ─────────────────────
│
│ ◆ 검색어 입력
│ │ > value object
│ │
│ ◆ 카드 선택
│ │   2a Value Object 정의
│ │   2b Value Object 불변성
│ │ > 2a 선택
│ │
│ ◆ 연결 이유?
│ │ ○ 지지
│ │ ○ 반박
│ │ ● 대조
│ │ ○ 확장
│ │ ○ 질문
│ │ ○ 직접 입력
│ │
│ ◆ 다른 카드와 더 연결? (Y/n)
│ │ > Y
│ │
│ ◆ 검색어 입력
│ │ > aggregate
│ │
│ ◆ 카드 선택
│ │   3a Aggregate 개념
│ │ > 3a 선택
│ │
│ ◆ 연결 이유?
│ │ ○ 지지
│ │ ○ 반박
│ │ ○ 대조
│ │ ○ 확장
│ │ ○ 질문
│ │ ● 직접 입력
│ │
│ ◆ 연결 이유를 입력하세요
│ │ > 상위 개념
│ │
│ ◆ 다른 카드와 더 연결? (Y/n)
│ │ > N
│
└──────────────────────────────────────
│
◆ 참조할 Literature가 있나요? (Y/n)
│ > Y
│
┌─ 참조 추가 루프 ─────────────────────
│
│ ◆ 검색어 입력
│ │ > evans ddd
│ │
│ ◆ Literature 선택
│ │   lit:evans-ddd-ch3  Evans DDD - Entity 정의
│ │   lit:evans-ddd-ch5  Evans DDD - Aggregate
│ │ > lit:evans-ddd-ch3 선택
│ │
│ ◆ 다른 Literature 더 참조? (Y/n)
│ │ > N
│
└──────────────────────────────────────
│
✓ 카드 1a1a 생성 완료
✓ 연결됨: 2a (대조), 3a (상위 개념)
✓ 참조됨: lit:evans-ddd-ch3
```

---

### `zettel list`

노트 목록 조회

**플래그**

| 플래그 | 축약 | 값 | 설명 |
|--------|------|-----|------|
| `--type` | `-t` | `fleeting`, `literature`, `zettel` | 타입 필터 |
| `--limit` | `-n` | number | 출력 개수 제한 |

**예시**
```bash
zettel list                     # 전체 (타입 선택 메뉴)
zettel list -t fleeting         # fleeting만
zettel list -t zettel -n 10     # zettel 최근 10개
```

---

### `zettel show <id>`

노트 상세 보기

**인자**

| 인자 | 필수 | 설명 |
|------|------|------|
| `id` | 아니오 | 카드 ID (없으면 선택 메뉴) |

**예시**
```bash
zettel show                     # 카드 선택 메뉴
zettel show 1a1                 # Zettel 보기
zettel show lit:evans-ddd-ch3   # Literature 보기
zettel show fl:250129:1         # Fleeting 보기
```

**출력 예시 (Zettel)**
```
┌─────────────────────────────────────┐
│ [1a1] Entity는 식별자로 구분된다     │
│ type: zettel                        │
├─────────────────────────────────────┤
│                                     │
│ Entity는 식별자(identity)로 구분되는 │
│ 객체다. 같은 속성을 가져도 ID가      │
│ 다르면 다른 Entity다.               │
│                                     │
├─────────────────────────────────────┤
│ Outgoing:                           │
│   → 1a (파생)                       │
│   → 3b (반박)                       │
│                                     │
│ Incoming:                           │
│   ← 1a1a (확장)                     │
│   ← 2c (참고)                       │
│                                     │
│ References:                         │
│   lit:evans-ddd-ch3                 │
│   lit:fowler-refactoring-ch2        │
│                                     │
│ Index:                              │
│   # DDD                             │
│   # 소프트웨어-아키텍처              │
└─────────────────────────────────────┘
```

**출력 예시 (Literature)**
```
┌─────────────────────────────────────┐
│ [lit:evans-ddd-ch3]                 │
│ Evans DDD - Entity 정의             │
│ type: literature                    │
├─────────────────────────────────────┤
│ source: Eric Evans, Domain-Driven   │
│         Design, Chapter 3, p.89     │
├─────────────────────────────────────┤
│                                     │
│ 에반스는 Entity를 "연속성과 식별자로 │
│ 정의되는 객체"라고 설명한다.         │
│                                     │
├─────────────────────────────────────┤
│ Referenced by:                      │
│   ← 1a1 Entity는 식별자로 구분된다   │
│   ← 2a Value Object와의 차이        │
└─────────────────────────────────────┘
```

---

### `zettel edit <id>`

노트 편집 (ID, 제목, 내용, 출처 모두 수정 가능)

**편집 가능 항목**
- **ID**: 변경 시 모든 연결이 자동 업데이트됨 (ON UPDATE CASCADE)
- **title**: 제목
- **content**: 내용
- **source**: 출처 (Literature만)

**인자**

| 인자 | 필수 | 설명 |
|------|------|------|
| `id` | 아니오 | 카드 ID (없으면 선택 메뉴) |

**플래그**

| 플래그 | 축약 | 값 | 설명 |
|--------|------|-----|------|
| `--editor` | `-e` | string | 사용할 에디터 (기본: $EDITOR) |

**예시**
```bash
zettel edit                     # 카드 선택 메뉴
zettel edit 1a1                 # 바로 편집
zettel edit 1a1 -e nvim         # nvim으로 편집
```

**주의**: ID 변경 시 links, references, index_entries가 자동 업데이트됨

---

### `zettel delete <id>`

노트 삭제

**인자**

| 인자 | 필수 | 설명 |
|------|------|------|
| `id` | 아니오 | 카드 ID (없으면 선택 메뉴) |

**플래그**

| 플래그 | 축약 | 설명 |
|--------|------|------|
| `--force` | `-f` | 확인 없이 삭제 |

**예시**
```bash
zettel delete                   # 카드 선택 메뉴
zettel delete 1a1               # 확인 후 삭제
zettel delete 1a1 -f            # 바로 삭제
```

**주의**: 다른 카드에서 참조 중인 경우 경고 표시 (삭제는 가능, dangling 링크 발생)

---

### `zettel link <source> <target>`

노트 연결

**인자**

| 인자 | 필수 | 설명 |
|------|------|------|
| `source` | 아니오 | 출발 카드 ID |
| `target` | 아니오 | 도착 카드 ID |

**플래그**

| 플래그 | 축약 | 값 | 설명 |
|--------|------|-----|------|
| `--reason` | `-r` | string | 연결 이유 (필수, 미입력시 프롬프트) |

**기본 제공 이유**: 지지, 반박, 확장, 대조, 질문 (또는 직접 입력)

**연결은 단방향**: A → B 연결 시, A의 outgoing에만 B 추가. B에서는 incoming으로 보임 (런타임 계산).

**예시**
```bash
zettel link                         # 두 카드 선택 메뉴
zettel link 1a1 3b                  # 1a1 → 3b 연결
zettel link 1a1 3b -r "반박"        # 기본 제공 이유
zettel link 1a1 3b -r "실무 적용 사례"  # 커스텀 이유
```

---

### `zettel unlink <source> <target>`

연결 해제

**인자**

| 인자 | 필수 | 설명 |
|------|------|------|
| `source` | 아니오 | 출발 카드 ID |
| `target` | 아니오 | 도착 카드 ID |

**예시**
```bash
zettel unlink                   # 선택 메뉴
zettel unlink 1a1 3b            # 1a1 → 3b 연결 해제
```

---

### `zettel promote <id>`

Fleeting → Zettel 승격

제텔카스텐 워크플로우의 핵심 단계. Fleeting은 며칠 내 검토하여 
가치 있으면 Zettel로 승격하고, 아니면 삭제한다.

**인자**

| 인자 | 필수 | 설명 |
|------|------|------|
| `id` | 아니오 | fleeting ID (없으면 선택 메뉴) |

**플래그**

| 플래그 | 축약 | 값 | 설명 |
|--------|------|-----|------|
| `--parent` | `-p` | ID | 파생 원본 지정 |
| `--id` | `-i` | string | 새 ID 직접 지정 |

**예시**
```bash
zettel promote                  # fleeting 선택 메뉴
zettel promote fl:250129:1      # 승격 (ID 자동 제안)
zettel promote fl:250129:1 -p 1a     # 1a에서 파생으로 승격
zettel promote fl:250129:1 -i 2a     # ID 직접 지정
```

**인터랙티브 플로우**
```
◆ 승격할 fleeting 선택
│   fl:250129:1  DDD에서 Aggregate 경계가... (2시간 전)
│   fl:250128:idea1  재즈 솔로와 리듬 섹션... (어제)
│
◆ 기존 카드에서 파생?
│ ● 예 → 1a 선택
│
◆ 제안 ID: 1a3
│ > _
│
◆ 내용 수정? (Y/n)
│ [$EDITOR 실행]
│
◆ 연결할 카드가 있나요? (Y/n)
│ > Y
│
┌─ 연결 추가 루프 ─────────────────────
│ (new 명령어와 동일)
└──────────────────────────────────────
│
✓ fl:250129:1 → 1a3 승격 완료
✓ 원본 fleeting 삭제됨
```

---

### `zettel search <query>`

검색 (제목 + 내용)

**인자**

| 인자 | 필수 | 설명 |
|------|------|------|
| `query` | 아니오 | 검색어 (없으면 입력 프롬프트) |

**플래그**

| 플래그 | 축약 | 값 | 설명 |
|--------|------|-----|------|
| `--type` | `-t` | `fleeting`, `literature`, `zettel` | 타입 필터 |
| `--limit` | `-n` | number | 결과 개수 제한 |

**예시**
```bash
zettel search                   # 검색어 입력 프롬프트
zettel search entity            # 바로 검색
zettel search entity -t zettel  # zettel만 검색
zettel search "value object" -n 5
```

---

### `zettel index <subcommand>`

인덱스 관리

**서브커맨드**

| 서브커맨드 | 설명 |
|------------|------|
| (없음) | 서브커맨드 선택 메뉴 |
| `list` | 인덱스 목록 |
| `show <name>` | 인덱스 내용 보기 |
| `create <name>` | 인덱스 생성 |
| `add <name> <id>` | 인덱스에 카드 추가 |
| `remove <name> <id>` | 인덱스에서 카드 제거 |
| `delete <name>` | 인덱스 삭제 |

**플래그 (delete용)**

| 플래그 | 축약 | 설명 |
|--------|------|------|
| `--force` | `-f` | 확인 없이 삭제 |

**예시**
```bash
zettel index                            # 서브커맨드 선택 메뉴
zettel index list
zettel index show ddd
zettel index create "소프트웨어 아키텍처"
zettel index add ddd 1a1
zettel index remove ddd 1a1
zettel index delete ddd
zettel index delete ddd -f
```

---

### `zettel tree <id>`

연결 트리 시각화 (outgoing만 탐색)

**인자**

| 인자 | 필수 | 설명 |
|------|------|------|
| `id` | 아니오 | 중심 카드 ID (없으면 선택 메뉴) |

**플래그**

| 플래그 | 축약 | 값 | 설명 |
|--------|------|-----|------|
| `--depth` | `-d` | number | 탐색 깊이 (기본: 1) |

**예시**
```bash
zettel tree                     # 카드 선택 메뉴
zettel tree 1a1                 # 직접 연결만 (depth 1)
zettel tree 1a1 -d 2            # 2단계까지
```

**출력 예시 (depth 1)**
```
1a1 Entity는 식별자로 구분된다
├── 1a (파생)
└── 3b (반박)
```

**출력 예시 (depth 2)**
```
1a1 Entity는 식별자로 구분된다
├── 1a (파생)
│   ├── 1 (파생)
│   └── 2b (대조)
└── 3b (반박)
    ├── 3a (파생)
    └── 4c (지지)
```

---

### `zettel history`

변경 히스토리 조회

**플래그**

| 플래그 | 축약 | 값 | 설명 |
|--------|------|-----|------|
| `--limit` | `-n` | number | 출력 개수 (기본: 50) |

**예시**
```bash
zettel history              # 최근 50개
zettel history -n 100       # 최근 100개
```

**출력 예시**
```
┌──────────────────────────────────────────────────────────────┐
│ History                                                      │
├──────────────────────────────────────────────────────────────┤
│ 2025-01-29 15:30:42  CREATE   zettel      1a1                │
│ 2025-01-29 15:31:10  LINK     link        1a1 → 2a (대조)    │
│ 2025-01-29 15:32:05  UPDATE   zettel      1a1 (title)        │
│ 2025-01-29 15:33:20  UPDATE   zettel      1a1 → 2b (id)      │
│ 2025-01-29 15:35:00  DELETE   fleeting    fl:250129:1        │
│ 2025-01-29 15:36:15  UNLINK   link        2b → 3a            │
└──────────────────────────────────────────────────────────────┘
```

---

### `zettel dangling`

끊어진 링크(dangling) 조회

삭제된 카드를 참조하는 링크 목록을 보여준다.

**예시**
```bash
zettel dangling
```

**출력 예시**
```
┌─────────────────────────────────────────────┐
│ Dangling Links                              │
├─────────────────────────────────────────────┤
│ 1a1 → ??? (반박)      # 삭제된 카드 참조    │
│ 2b  → ??? (확장)                            │
│                                             │
│ 1a1 -ref→ ???         # 삭제된 Literature   │
└─────────────────────────────────────────────┘

2 broken links, 1 broken reference
```

---

### `zettel config`

설정 관리

**서브커맨드**

| 서브커맨드 | 설명 |
|------------|------|
| (없음) | 현재 설정 보기 |
| `language <code>` | 언어 변경 (`ko-KR`, `en-US`) |

**예시**
```bash
zettel config                   # 현재 설정 보기
zettel config language ko-KR    # 한국어로 변경
zettel config language en-US    # English로 변경
```

**출력 (설정 보기)**
```
┌─────────────────────────────┐
│ Zettelkasten Settings       │
├─────────────────────────────┤
│ language: en-US (English)   │
│ path: ~/.zettel/            │
└─────────────────────────────┘
```

---

### `zettel export`

마크다운 파일로 내보내기

**출력 폴더 구조**
```
# 기본 (경로 미지정)
~/Documents/zettel/250129_153042/
├── fleeting/
├── literature/
└── zettel/

# 커스텀 경로 지정
${custom-path}/
├── fleeting/
├── literature/
└── zettel/
```

**플래그**

| 플래그 | 축약 | 값 | 설명 |
|--------|------|-----|------|
| `--type` | `-t` | `fleeting`, `literature`, `zettel`, `all` | 내보낼 타입 (기본: all) |
| `--output` | `-o` | path | 출력 디렉토리 (기본: `~/Documents/zettel/${datetime}/`) |

**예시**
```bash
zettel export                       # ~/Documents/zettel/250129_153042/
zettel export -t zettel             # zettel만
zettel export -o ~/backup/zettel    # ~/backup/zettel/fleeting,literature,zettel
```

**인터랙티브 플로우**
```
◆ Export path (Enter for default)
│ > _
│
◆ Exporting...
✓ fleeting/  : 12 files
✓ literature/: 8 files
✓ zettel/    : 45 files
✓ Exported to ~/Documents/zettel/250129_153042/
```

---

## 명령어 요약

| 명령어 | 설명 |
|--------|------|
| `zettel init` | 초기화 (디렉토리 + DB 생성) |
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
| `zettel tree <id>` | 연결 트리 |
| `zettel history` | 변경 히스토리 |
| `zettel dangling` | 끊어진 링크 조회 |
| `zettel config` | 설정 관리 |
| `zettel export` | 마크다운 내보내기 |

---

## 개발 마일스톤

### v0.1 - MVP
- [ ] 프로젝트 셋업 (Bun + TypeScript + @clack/prompts)
- [ ] `init` 명령어 (디렉토리 + SQLite + FTS5 + 히스토리 테이블 + 언어 선택)
- [ ] 다국어 지원 (ko-KR, en-US)
- [ ] `new`, `list`, `show` 명령어
- [ ] 기본 ID 시스템 (자동 제안)
- [ ] 모든 변경 히스토리 기록

### v0.2 - 연결
- [ ] `link`, `unlink` 명령어
- [ ] 연결 이유 기록
- [ ] `show`에서 outgoing/incoming 표시

### v0.3 - 검색 & 탐색
- [ ] `search` 명령어 (FTS5 기반)
- [ ] `tree` 명령어
- [ ] 인덱스 카드 (`index` 서브커맨드)
- [ ] `show`에서 소속 인덱스 표시

### v0.4 - 워크플로우
- [ ] `promote` 명령어
- [ ] `edit` 외부 에디터 연동
- [ ] `delete` 참조 경고 + dangling 허용
- [ ] `dangling` 명령어
- [ ] `history` 명령어

### v0.5 - 내보내기 & 설정
- [ ] `export` 명령어 (마크다운)
- [ ] `config` 명령어

---

## 향후 확장 가능성

- **Import**: 마크다운 파일에서 가져오기 (Obsidian 등)
- **Sync**: Git 기반 동기화 (export + import)
- **Web UI**: 브라우저에서 그래프 뷰
- **AI 연동**: 연결 제안, 요약 생성

---

*"위치가 아니라 연결이 중요하다"*
