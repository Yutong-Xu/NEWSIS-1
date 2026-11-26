import AppLoader from '@/components/app-loader';
import { LanguageProvider } from '@/components/language';
export default function Page() { return <LanguageProvider><AppLoader /></LanguageProvider>; }
