// Lightweight i18n with no external dependency. V1 is English-only; the
// Dict-typed structure makes it straightforward to add a second locale later
// without touching components.
//
// Usage:
//   import { t } from '$lib/i18n';
//   <h1>{t.onboarding.welcome}</h1>

import { en, type Dict } from './en';

export type { Dict };

// Registry of available locales. Add new ones here once translated. Const locales: Record<string, Dict> = { en };

// Active locale. Hardcoded to English for v1. Export const activeLocale = 'en';

export const t: Dict = locales[activeLocale] ?? en;
