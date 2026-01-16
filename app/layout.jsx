import { Layout } from '@/components/dom/Layout'
import '@/global.css'

export const metadata = {
  title: 'OMEN塔罗',
  description: '神秘而温暖的塔罗体验',
}

export default function RootLayout({ children }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'OMEN塔罗',
    url: 'https://omen-tarot.vercel.app/',
    description: '神秘而温暖的塔罗体验',
    keywords: '塔罗,塔罗牌,塔罗占卜,塔罗解读,免费塔罗,在线塔罗',
  }

  return (
    <html lang='zh-CN' className='antialiased'>
      {/*
        <head /> will contain the components returned by the nearest parent
        head.tsx. Find out more at https://beta.nextjs.org/docs/api-reference/file-conventions/head
      */}
      <head>
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        {/* To avoid FOUT with styled-components wrap Layout with StyledComponentsRegistry https://beta.nextjs.org/docs/styling/css-in-js#styled-components */}
        <Layout>{children}</Layout>
      </body>
    </html>
  )
}
