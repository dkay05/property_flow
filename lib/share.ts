import { Platform, Share } from 'react-native';
import { getApiBaseUrl } from './api';

/** The public, no-login page for a property — this is what gets shared. */
export function propertyShareUrl(propertyId: string): string {
  return `${getApiBaseUrl()}/p/${propertyId}`;
}

export type ShareResult = 'shared' | 'copied' | 'dismissed' | 'unavailable';

/**
 * Opens the native share sheet on iOS/Android. On web it uses the Web Share
 * API where the browser has one (mostly mobile) and otherwise falls back to
 * copying the link to the clipboard.
 */
export async function shareProperty({
  propertyId,
  title,
  message,
}: {
  propertyId: string;
  title: string;
  message?: string;
}): Promise<ShareResult> {
  const url = propertyShareUrl(propertyId);
  const text = message ? `${message}\n${url}` : url;

  if (Platform.OS !== 'web') {
    const result = await Share.share({ title, message: text, url }, { dialogTitle: title });
    return result.action === Share.sharedAction ? 'shared' : 'dismissed';
  }

  const nav = globalThis.navigator as Navigator | undefined;

  if (nav?.share) {
    try {
      await nav.share({ title, text: message || title, url });
      return 'shared';
    } catch (e: any) {
      // The user closing the sheet surfaces as AbortError — not a failure.
      if (e?.name === 'AbortError') return 'dismissed';
    }
  }

  if (nav?.clipboard?.writeText) {
    await nav.clipboard.writeText(url);
    return 'copied';
  }

  return 'unavailable';
}
