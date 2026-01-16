export const SECTION_LABELS = ['总体解读', '单牌解读', '行动建议']
export const READING_STEPS = ['focus_card_1', 'focus_card_2', 'focus_card_3', 'summary']
export const FOCUS_STEP_INDEX = {
  focus_card_1: 0,
  focus_card_2: 1,
  focus_card_3: 2,
}

export const getOrientationLabel = (orientation) => (orientation === 'reversed' ? '逆位' : '正位')

export const formatCardLabel = (card, orientation) => {
  if (!card) return ''
  const name = card.nameCN || card.name || 'Unknown'
  return `${name}（${getOrientationLabel(orientation)}）`
}

const parseLabeledSections = (text) => {
  const matches = []
  SECTION_LABELS.forEach((label) => {
    const regex = new RegExp(`(^|\\n)\\s*(?:#{1,3}\\s*)?${label}\\s*[:：]?`, 'm')
    const match = regex.exec(text)
    if (match) {
      matches.push({ label, index: match.index, length: match[0].length })
    }
  })

  if (matches.length < 2) return []
  matches.sort((a, b) => a.index - b.index)

  return matches.map((item, idx) => {
    const start = item.index + item.length
    const end = idx < matches.length - 1 ? matches[idx + 1].index : text.length
    const content = text.slice(start, end).trim()
    return {
      title: item.label,
      content: content || '暂无内容。',
    }
  })
}

export const extractLabeledSection = (text, label) => {
  if (!text) return ''
  const regex = new RegExp(`(^|\\n)\\s*(?:#{1,3}\\s*)?${label}\\s*[:：]?`, 'm')
  const match = regex.exec(text)
  if (!match) return ''
  const start = match.index + match[0].length
  const rest = text.slice(start)
  let nextIndex = rest.length
  SECTION_LABELS.forEach((nextLabel) => {
    if (nextLabel === label) return
    const nextRegex = new RegExp(`(^|\\n)\\s*(?:#{1,3}\\s*)?${nextLabel}\\s*[:：]?`, 'm')
    const nextMatch = nextRegex.exec(rest)
    if (nextMatch && nextMatch.index < nextIndex) {
      nextIndex = nextMatch.index
    }
  })
  return rest.slice(0, nextIndex).trim()
}

const splitIntoSections = (text) => {
  const numbered = text.match(/(?:^|\\n)\\d[\\).][\\s\\S]*?(?=\\n\\d[\\).]|\\n*$)/g)
  if (numbered && numbered.length >= 2) {
    return numbered.map((section) => section.trim()).filter(Boolean)
  }

  const headings = text.match(/(?:^|\\n)#{1,3}\\s[\\s\\S]*?(?=\\n#{1,3}\\s|\\n*$)/g)
  if (headings && headings.length >= 2) {
    return headings.map((section) => section.trim()).filter(Boolean)
  }

  return text
    .split(/\\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean)
}

export const buildPages = (text) => {
  const labeled = parseLabeledSections(text)
  if (labeled.length >= 2) return labeled

  const sections = splitIntoSections(text)
  if (sections.length > 0) {
    return sections.map((section, index) => ({
      title: `第${index + 1}步`,
      content: section,
    }))
  }

  const trimmed = text.trim()
  return trimmed
    ? [
        {
          title: '解读',
          content: trimmed,
        },
      ]
    : []
}

export const getSectionContent = (pages, label) => {
  if (!Array.isArray(pages)) return ''
  const match = pages.find((page) => page.title === label)
  return match ? match.content : ''
}

export const getNextStep = (step) => {
  const index = READING_STEPS.indexOf(step)
  if (index === -1) return 'focus_card_1'
  return READING_STEPS[index + 1] || 'idle'
}

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const findMarkerMatch = (text, patterns) => {
  let best = null
  patterns.forEach((pattern) => {
    const match = text.match(pattern)
    if (!match || match.index == null) return
    if (!best || match.index < best.index) {
      best = { index: match.index, length: match[0].length }
    }
  })
  return best
}

export const splitSingleCardContent = (text, cardsMeta) => {
  if (!text || !Array.isArray(cardsMeta) || cardsMeta.length === 0) return []
  const cardCount = cardsMeta.length
  const cleanSection = (value) => {
    let content = String(value || '').trim()
    content = content.replace(/^\\s*(\\*\\*|__)\\s*/, '')
    content = content.replace(
      /^\\s*(?:\\*\\*\\s*)?(?:第\\s*)?([1-3]|一|二|三)\\s*(?:张|牌)?\\s*[).、:：·.\\uFF0E-]\\s*(?:\\*\\*)?\\s*/m,
      ''
    )
    content = content.replace(/(\\*\\*|__)\\s*$/g, '')
    return content.trim()
  }

  const splitByMarkers = (markers) => {
    if (!markers.length) return []
    const sorted = markers.slice().sort((a, b) => a.index - b.index)
    const sections = Array(cardCount).fill('')
    let nextFallback = 0
    const claimFallbackIndex = () => {
      while (nextFallback < cardCount && sections[nextFallback]) {
        nextFallback += 1
      }
      if (nextFallback >= cardCount) return null
      const idx = nextFallback
      nextFallback += 1
      return idx
    }

    sorted.forEach((marker, idx) => {
      const start = marker.index + marker.length
      const end = idx < sorted.length - 1 ? sorted[idx + 1].index : text.length
      const content = cleanSection(text.slice(start, end))
      const preferredIndex =
        Number.isInteger(marker.cardIndex) && marker.cardIndex >= 0 && marker.cardIndex < cardCount
          ? marker.cardIndex
          : null
      const targetIndex =
        preferredIndex !== null && !sections[preferredIndex]
          ? preferredIndex
          : claimFallbackIndex()
      if (targetIndex === null) return
      sections[targetIndex] = content
    })

    return sections
  }

  const buildCardMarker = (card, index) => {
    if (!card) return null
    const name = card.name || ''
    const orientation = card.orientationLabel || ''
    if (!name) return null
    const escapedName = escapeRegex(name)
    const escapedOrientation = orientation ? escapeRegex(orientation) : ''
    const numberPrefix =
      '(?:(?:第\\s*(?:[1-3]|一|二|三)\\s*(?:张|牌)?\\s*(?:[).、:：·.\\uFF0E-]\\s*)?)|(?:[1-3]|一|二|三)\\s*(?:张|牌)?\\s*(?:[).、:：·.\\uFF0E-]\\s*))?'
    const tail = '\\s*(?:[:：-]\\s*)?(?:\\*\\*)?'
    const patterns = [
      escapedOrientation
        ? new RegExp(
            `(^|\\n)\\s*(?:\\*\\*\\s*)?${numberPrefix}${escapedName}\\s*[（(]?\\s*${escapedOrientation}\\s*[)）]?${tail}`,
            'm'
          )
        : null,
      escapedOrientation
        ? new RegExp(
            `(^|\\n)\\s*(?:\\*\\*\\s*)?${escapedName}\\s*[（(]?\\s*${escapedOrientation}\\s*[)）]?${tail}`,
            'm'
          )
        : null,
    ].filter(Boolean)
    const marker = findMarkerMatch(text, patterns)
    return marker ? { ...marker, cardIndex: index } : null
  }

  const cardMarkers = cardsMeta.map((card, index) => buildCardMarker(card, index)).filter(Boolean)
  const mapChineseNumber = (value) => {
    if (!value) return null
    if (value === '一') return 1
    if (value === '二') return 2
    if (value === '三') return 3
    return null
  }

  const numberedRegex =
    /(^|\\n)\\s*(?:\\*\\*\\s*)?(?:第\\s*)?([1-3]|一|二|三)\\s*(?:张|牌)?\\s*(?:[).、:：·.\\uFF0E-]|$)\\s*(?:\\*\\*)?/g
  const numberedMarkers = []
  let numberedMatch = numberedRegex.exec(text)
  while (numberedMatch) {
    const rawNumber = numberedMatch[2]
    const parsed = Number.isNaN(Number(rawNumber))
      ? mapChineseNumber(rawNumber)
      : Number(rawNumber)
    const cardIndex = parsed ? parsed - 1 : null
    numberedMarkers.push({
      index: numberedMatch.index,
      length: numberedMatch[0].length,
      cardIndex,
    })
    numberedMatch = numberedRegex.exec(text)
  }

  if (cardMarkers.length >= 2) {
    return splitByMarkers(cardMarkers)
  }
  if (numberedMarkers.length >= 2) {
    return splitByMarkers(numberedMarkers)
  }
  if (cardMarkers.length === 1) {
    return splitByMarkers(cardMarkers)
  }

  const sections = splitIntoSections(text)
  if (sections.length >= cardCount) {
    return sections.slice(0, cardCount).map((section) => cleanSection(section))
  }
  return []
}
