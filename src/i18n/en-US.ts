export const enUS = {
  // General
  error: 'Error',
  success: 'Success',
  cancel: 'Cancelled',
  confirm: 'Confirm',
  yes: 'Yes',
  no: 'No',

  // Init
  initSelectLanguage: 'Select language',
  initInitializing: 'Initializing Zettelkasten...',
  initDirectoryCreated: 'Directory created',
  initDatabaseCreated: 'Database created',
  initComplete: 'Initialization complete!',
  initToStart: 'To start: zettel new',
  initAlreadyExists: 'Zettelkasten already initialized at',
  initNotInitialized: 'Zettelkasten is not initialized.',
  initRunFirst: 'Run first: zettel init',

  // New
  newSelectType: 'What type of note?',
  newTypeFleeting: 'fleeting',
  newTypeLiterature: 'literature',
  newTypeZettel: 'zettel',
  newIsDerived: 'Is this derived from an existing card?',
  newNotDerived: 'No, new idea',
  newYesDerived: 'Yes, from existing card',
  newSearchParent: 'Which card is it derived from? (search)',
  newSuggestedId: 'Suggested ID',
  newEnterIdOrConfirm: '(Enter to confirm, or type custom ID)',
  newEnterId: 'Enter ID',
  newEnterTitle: 'Title',
  newEnterContent: 'Content (opening external editor...)',
  newEnterSource: 'Source (e.g., "Author, Book, p.123")',
  newAddLinks: 'Connect to other cards?',
  newSearchLink: 'Search card to link',
  newSelectCard: 'Select card',
  newLinkReason: 'Reason for connection?',
  newReasonSupport: 'Support',
  newReasonContradict: 'Contradict',
  newReasonExtend: 'Extend',
  newReasonContrast: 'Contrast',
  newReasonQuestion: 'Question',
  newReasonCustom: 'Custom',
  newEnterCustomReason: 'Enter reason',
  newAddMoreLinks: 'Connect to another card?',
  newAddReferences: 'Reference any Literature?',
  newSearchLiterature: 'Search Literature',
  newAddMoreReferences: 'Reference another Literature?',
  newCreated: 'Created',
  newLinked: 'Linked',
  newReferenced: 'Referenced',
  newIdExists: 'ID already exists. Please enter a different ID.',

  // List
  listSelectType: 'Which type to list?',
  listAll: 'All',
  listNoNotes: 'No notes found',

  // Show
  showSelectCard: 'Select card to view',
  showNotFound: 'Note not found',
  showType: 'type',
  showSource: 'source',
  showOutgoing: 'Outgoing',
  showIncoming: 'Incoming',
  showReferences: 'References',
  showReferencedBy: 'Referenced by',
  showIndex: 'Index',

  // Edit
  editSelectCard: 'Select card to edit',
  editSelectField: 'What to edit?',
  editFieldId: 'ID',
  editFieldTitle: 'Title',
  editFieldContent: 'Content',
  editFieldSource: 'Source',
  editEnterNewValue: 'Enter new value',
  editUpdated: 'Updated',

  // Delete
  deleteSelectCard: 'Select card to delete',
  deleteConfirm: 'Are you sure you want to delete',
  deleteWarningLinks:
    'Warning: This card is referenced by other cards. Deleting will create dangling links.',
  deleteDeleted: 'Deleted',

  // Link
  linkSelectSource: 'Select source card',
  linkSelectTarget: 'Select target card',
  linkCreated: 'Link created',
  linkAlreadyExists: 'Link already exists',

  // Unlink
  unlinkSelectSource: 'Select source card',
  unlinkSelectTarget: 'Select target card to unlink',
  unlinkRemoved: 'Link removed',

  // Promote
  promoteSelectFleeting: 'Select fleeting note to promote',
  promoteEditContent: 'Edit content?',
  promotePromoted: 'Promoted',
  promoteOriginalDeleted: 'Original fleeting note deleted',

  // Search
  searchEnterQuery: 'Enter search query',
  searchNoResults: 'No results found',

  // Index
  indexSelectAction: 'Select action',
  indexActionList: 'List indexes',
  indexActionShow: 'Show index',
  indexActionCreate: 'Create index',
  indexActionAdd: 'Add card to index',
  indexActionRemove: 'Remove card from index',
  indexActionDelete: 'Delete index',
  indexEnterName: 'Index name',
  indexSelectIndex: 'Select index',
  indexSelectCard: 'Select card to add',
  indexEnterLabel: 'Label (optional)',
  indexCreated: 'Index created',
  indexDeleted: 'Index deleted',
  indexCardAdded: 'Card added to index',
  indexCardRemoved: 'Card removed from index',
  indexNoIndexes: 'No indexes found',
  indexAlreadyExists: 'Index already exists',

  // Tree
  treeSelectCard: 'Select card for tree view',
  treeDepth: 'Depth',

  // History
  historyTitle: 'History',
  historyNoEntries: 'No history entries',

  // Dangling
  danglingTitle: 'Dangling Links',
  danglingBrokenLinks: 'broken links',
  danglingBrokenRefs: 'broken references',
  danglingNone: 'No dangling links found',

  // Config
  configTitle: 'Zettelkasten Settings',
  configLanguage: 'language',
  configPath: 'path',
  configUpdated: 'Setting updated',

  // Export
  exportSelectType: 'What to export?',
  exportEnterPath: 'Export path (Enter for default)',
  exportExporting: 'Exporting...',
  exportFiles: 'files',
  exportedTo: 'Exported to',
}

export type Messages = typeof enUS
