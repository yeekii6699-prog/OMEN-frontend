const title = 'React Three Next Starter'
const url = 'https://react-three-next.vercel.app/'
const description = 'The easiest and fastest way to create a 3D website using React Three Fiber and NextJS'
const author = 'Author'
const twitter = '@pmndrs'

export default function Head() {
  return (
    <>
      {/* Recommended Meta Tags */}
      <meta charSet='utf-8' />
      <meta name='language' content='english' />
      <meta httpEquiv='content-type' content='text/html' />
      <meta name='author' content={author} />
      <meta name='designer' content={author} />
      <meta name='publisher' content={author} />

      {/* Search Engine Optimization Meta Tags */}
      <title>{title}</title>
      <meta name='description' content={description} />
      <meta
        name='keywords'
        content='塔罗,塔罗牌,塔罗占卜,塔罗解读,免费塔罗,在线塔罗,塔罗测试,星座塔罗,神秘学,六芒星, tarot, tarot reading, free tarot'
      />
      <meta name='robots' content='index,follow' />
      <meta name='distribution' content='web' />
      {/* 
      Facebook Open Graph meta tags
        documentation: https://developers.facebook.com/docs/sharing/opengraph */}
      <meta property='og:title' content={title} />
      <meta property='og:type' content='site' />
      <meta property='og:url' content={url} />
      <meta property='og:image' content={'/icons/logo.ico'} />
      <meta property='og:site_name' content={title} />
      <meta property='og:description' content={description} />

      <link rel='icon' href='/icons/logo.ico' sizes='any' />
      <link rel='icon' href='/icons/favicon-32x32.png' type='image/png' sizes='32x32' />
      <link rel='icon' href='/icons/favicon-16x16.png' type='image/png' sizes='16x16' />
      <link rel='apple-touch-icon' href='/icons/apple-touch-icon.png' sizes='180x180' />
      <link rel='manifest' href='/manifest.json' />
      <link rel='mask-icon' color='#000000' href='/icons/safari-pinned-tab.svg' />

      {/* Twitter Share Image */}
      <meta name='twitter:image' content={'/icons/logo.ico'} />

      {/* Meta Tags for HTML pages on Mobile */}
      {/* <meta name="format-detection" content="telephone=yes"/>
        <meta name="HandheldFriendly" content="true"/>  */}
      <meta name='viewport' content='width=device-width, minimum-scale=1, initial-scale=1.0' />
      <meta name='theme-color' content='#000' />

      {/* 
      Twitter Summary card
        documentation: https://dev.twitter.com/cards/getting-started
        Be sure validate your Twitter card markup on the documentation site. */}
      <meta name='twitter:card' content='summary' />
      <meta name='twitter:site' content={twitter} />
    </>
  )
}
