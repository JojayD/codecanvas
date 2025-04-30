import { TLUiComponents, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// To keep a component, either:
// 1. Remove it from this object completely to use the default implementation
// 2. Set it to undefined instead of null
// 3. Provide your own custom component implementation

export const components: Partial<TLUiComponents> = {
	// Components we want to remove (set to null)
	ContextMenu: null,
	ActionsMenu: null,
	HelpMenu: null,
	MainMenu: null,
	Minimap: null,
	StylePanel: null,
	PageMenu: null,
	KeyboardShortcutsDialog: null,
	QuickActions: null,
	DebugPanel: null,
	DebugMenu: null,
	SharePanel: null,
	MenuPanel: null,
	CursorChatBubble: null,
	RichTextToolbar: null,
	
	// Components we want to keep (remove from the object or set to undefined)
	// ZoomMenu: undefined,
	// NavigationPanel: undefined,
	// Toolbar: undefined,
	// HelperButtons: undefined,
	// TopPanel: undefined,
	// Dialogs: undefined,
	// Toasts: undefined,
	// A11y: undefined,
}