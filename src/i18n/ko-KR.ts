import type { Messages } from './en-US'

export const koKR: Messages = {
  // General
  error: '오류',
  success: '성공',
  cancel: '취소됨',
  confirm: '확인',
  yes: '예',
  no: '아니오',

  // Init
  initSelectLanguage: '언어 선택 / Select language',
  initInitializing: 'Zettelkasten 초기화 중...',
  initDirectoryCreated: '디렉토리 생성됨',
  initDatabaseCreated: '데이터베이스 생성됨',
  initComplete: '초기화 완료!',
  initToStart: '시작하려면: zettel new',
  initAlreadyExists: '이미 초기화되어 있습니다',
  initNotInitialized: 'Zettelkasten이 초기화되지 않았습니다.',
  initRunFirst: '먼저 실행하세요: zettel init',

  // New
  newSelectType: '어떤 타입의 노트인가요?',
  newTypeFleeting: 'fleeting',
  newTypeLiterature: 'literature',
  newTypeZettel: 'zettel',
  newIsDerived: '기존 카드에서 파생된 생각인가요?',
  newNotDerived: '아니오, 새로운 아이디어',
  newYesDerived: '예, 기존 카드에서',
  newSearchParent: '어떤 카드에서 파생? (검색)',
  newSuggestedId: '제안 ID',
  newEnterIdOrConfirm: '(Enter로 확인, 또는 직접 입력)',
  newEnterId: 'ID 입력',
  newEnterTitle: '제목',
  newEnterContent: '내용 (외부 에디터에서 작성...)',
  newEnterSource: '출처 (예: "저자, 책, p.123")',
  newAddLinks: '연결할 카드가 있나요?',
  newSearchLink: '연결할 카드 검색',
  newSelectCard: '카드 선택',
  newLinkReason: '연결 이유?',
  newReasonSupport: '지지',
  newReasonContradict: '반박',
  newReasonExtend: '확장',
  newReasonContrast: '대조',
  newReasonQuestion: '질문',
  newReasonCustom: '직접 입력',
  newEnterCustomReason: '이유 입력',
  newAddMoreLinks: '다른 카드와 더 연결?',
  newAddReferences: '참조할 Literature가 있나요?',
  newSearchLiterature: 'Literature 검색',
  newAddMoreReferences: '다른 Literature 더 참조?',
  newCreated: '생성됨',
  newLinked: '연결됨',
  newReferenced: '참조됨',
  newIdExists: 'ID가 이미 존재합니다. 다른 ID를 입력하세요.',

  // List
  listSelectType: '어떤 타입을 조회할까요?',
  listAll: '전체',
  listNoNotes: '노트가 없습니다',

  // Show
  showSelectCard: '조회할 카드 선택',
  showNotFound: '노트를 찾을 수 없습니다',
  showType: '타입',
  showSource: '출처',
  showOutgoing: 'Outgoing',
  showIncoming: 'Incoming',
  showReferences: 'References',
  showReferencedBy: 'Referenced by',
  showIndex: 'Index',

  // Edit
  editSelectCard: '편집할 카드 선택',
  editSelectField: '무엇을 편집할까요?',
  editFieldId: 'ID',
  editFieldTitle: '제목',
  editFieldContent: '내용',
  editFieldSource: '출처',
  editEnterNewValue: '새 값 입력',
  editUpdated: '수정됨',

  // Delete
  deleteSelectCard: '삭제할 카드 선택',
  deleteConfirm: '정말 삭제하시겠습니까?',
  deleteWarningLinks:
    '경고: 이 카드를 참조하는 다른 카드가 있습니다. 삭제하면 끊어진 링크가 생깁니다.',
  deleteDeleted: '삭제됨',

  // Link
  linkSelectSource: '출발 카드 선택',
  linkSelectTarget: '도착 카드 선택',
  linkCreated: '연결 생성됨',
  linkAlreadyExists: '이미 연결되어 있습니다',

  // Unlink
  unlinkSelectSource: '출발 카드 선택',
  unlinkSelectTarget: '연결 해제할 카드 선택',
  unlinkRemoved: '연결 해제됨',

  // Promote
  promoteSelectFleeting: '승격할 fleeting 노트 선택',
  promoteEditContent: '내용을 수정할까요?',
  promotePromoted: '승격됨',
  promoteOriginalDeleted: '원본 fleeting 노트 삭제됨',

  // Search
  searchEnterQuery: '검색어 입력',
  searchNoResults: '검색 결과가 없습니다',

  // Index
  indexSelectAction: '작업 선택',
  indexActionList: '인덱스 목록',
  indexActionShow: '인덱스 보기',
  indexActionCreate: '인덱스 생성',
  indexActionAdd: '인덱스에 카드 추가',
  indexActionRemove: '인덱스에서 카드 제거',
  indexActionDelete: '인덱스 삭제',
  indexEnterName: '인덱스 이름',
  indexSelectIndex: '인덱스 선택',
  indexSelectCard: '추가할 카드 선택',
  indexEnterLabel: '라벨 (선택사항)',
  indexCreated: '인덱스 생성됨',
  indexDeleted: '인덱스 삭제됨',
  indexCardAdded: '인덱스에 카드 추가됨',
  indexCardRemoved: '인덱스에서 카드 제거됨',
  indexNoIndexes: '인덱스가 없습니다',
  indexAlreadyExists: '인덱스가 이미 존재합니다',

  // Tree
  treeSelectCard: '트리 뷰를 볼 카드 선택',
  treeDepth: '깊이',

  // History
  historyTitle: '히스토리',
  historyNoEntries: '히스토리가 없습니다',

  // Dangling
  danglingTitle: '끊어진 링크',
  danglingBrokenLinks: '개의 끊어진 링크',
  danglingBrokenRefs: '개의 끊어진 참조',
  danglingNone: '끊어진 링크가 없습니다',

  // Config
  configTitle: 'Zettelkasten 설정',
  configLanguage: '언어',
  configPath: '경로',
  configUpdated: '설정 업데이트됨',

  // Export
  exportSelectType: '무엇을 내보낼까요?',
  exportEnterPath: '내보내기 경로 (Enter로 기본값)',
  exportExporting: '내보내는 중...',
  exportFiles: '개 파일',
  exportedTo: '내보내기 완료',
}
