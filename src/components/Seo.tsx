import { useEffect } from 'react'

interface SeoProps {
  title: string
  description: string
  path: string
}

const baseUrl = 'https://internetathi.com'

export function Seo({ title, description, path }: SeoProps) {
  useEffect(() => {
    document.title = title

    const descriptionTag = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]')
    const ogDescription = document.querySelector<HTMLMetaElement>('meta[property="og:description"]')
    const ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]')
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')

    descriptionTag?.setAttribute('content', description)
    ogTitle?.setAttribute('content', title)
    ogDescription?.setAttribute('content', description)
    ogUrl?.setAttribute('content', `${baseUrl}${path}`)
    canonical?.setAttribute('href', `${baseUrl}${path}`)
  }, [description, path, title])

  return null
}
