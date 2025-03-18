// src/lib/clientApi.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export async function saveDocumentToApi(documentId: string, content: string, language: string) {
  const supabase = createClientComponentClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch('/api/documents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ documentId, content, language }),
  });

  return response.json();
}