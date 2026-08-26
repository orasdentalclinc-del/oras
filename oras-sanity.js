/*!
 * أوراس لطب الأسنان — رابط الموقع بلوحة التحكم
 * يقرأ المحتوى المنشور من اللوحة ويعرضه في الصفحة.
 * لا يحتوي أي مفتاح سري — القراءة فقط.
 */
(function () {
  'use strict'

  var CONFIG = Object.assign(
    {
      projectId: 'upxb9w10',
      dataset: 'production',
      apiVersion: '2024-01-01',
      refreshOnFocus: true,
    },
    window.ORAS_SANITY_CONFIG || {}
  )
  if (!CONFIG.projectId) return

  /* ---------- أدوات ---------- */
  function $(s, r) {
    return (r || document).querySelector(s)
  }
  function $$(s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s))
  }
  function setText(sel, v) {
    if (v === undefined || v === null || v === '') return
    var el = typeof sel === 'string' ? $(sel) : sel
    if (el) el.textContent = String(v)
  }
  function make(tag, cls, text) {
    var n = document.createElement(tag)
    if (cls) n.className = cls
    if (text !== undefined && text !== null && text !== '') n.textContent = String(text)
    return n
  }
  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild)
  }
  function safeUrl(v) {
    if (!v) return ''
    var raw = String(v).trim()
    if (/^[#/]/.test(raw)) return raw
    if (/^(https?:|mailto:|tel:)/i.test(raw)) return raw
    return ''
  }
  function digits(v) {
    return String(v || '').replace(/[^0-9]/g, '')
  }

  var PH =
    'data:image/svg+xml,' +
    encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'>" +
        "<rect width='800' height='600' fill='#FBF6E7'/>" +
        "<text x='400' y='320' text-anchor='middle' font-size='30' font-family='sans-serif' fill='#A8841C'>" +
        '\u0627\u0644\u0635\u0648\u0631\u0629 \u062a\u064f\u0636\u0627\u0641 \u0645\u0646 \u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645</text></svg>'
    )

  function imageUrl(source, w, h, crop) {
    var ref = source && source.asset && (source.asset._ref || source.asset._id)
    if (!ref) return ''
    var p = String(ref).split('-')
    if (p.length < 4) return ''
    var url =
      'https://cdn.sanity.io/images/' +
      encodeURIComponent(CONFIG.projectId) +
      '/' +
      encodeURIComponent(CONFIG.dataset) +
      '/' +
      p[1] +
      '-' +
      p[2] +
      '.' +
      p[3] +
      '?auto=format&q=80'
    if (w) url += '&w=' + w
    if (h) url += '&h=' + h
    if (crop) url += '&fit=crop&crop=entropy'
    else url += '&fit=max'
    return url
  }
  function setDataImg(key, source, w, h, crop) {
    var u = imageUrl(source, w, h, crop)
    var el = $('img[data-img="' + key + '"]')
    if (u && el) {
      el.setAttribute('src', u)
      el.removeAttribute('srcset')
    }
  }
  function imgEl(source, alt, w, h, crop) {
    var im = document.createElement('img')
    im.setAttribute('loading', 'lazy')
    im.setAttribute('src', imageUrl(source, w, h, crop) || PH)
    im.setAttribute('alt', alt || '')
    return im
  }

  /** يحوّل النص المنسّق من اللوحة إلى فقرات نصية */
  function blocksToParagraphs(blocks) {
    if (!Array.isArray(blocks)) return []
    return blocks
      .filter(function (b) {
        return b && b._type === 'block' && Array.isArray(b.children)
      })
      .map(function (b) {
        return b.children
          .map(function (c) {
            return c && typeof c.text === 'string' ? c.text : ''
          })
          .join('')
          .trim()
      })
      .filter(Boolean)
  }

  /* ---------- رموز الخدمات ---------- */
  var TOOTH =
    '<path d="M12 3c-2 0-2.6 1.2-4.3 1.2-2.3 0-3.3 1.7-3.3 4 0 4.1 2 6.2 2.8 10.4.4 2 2.9 2 3.3-.1.3-1.4.6-2.9 1.5-2.9s1.2 1.5 1.5 2.9c.4 2.1 2.9 2.1 3.3.1.8-4.2 2.8-6.3 2.8-10.4 0-2.3-1-4-3.3-4C14.6 4.2 14 3 12 3z"/>'
  var PATHS = {
    tooth: TOOTH,
    sparkle: TOOTH + '<path d="M18.5 2.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z"/>',
    align: TOOTH + '<path d="M4.5 9.5h15M8 8v3M12 8v3M16 8v3"/>',
    implant:
      '<path d="M12 2v6M9 9.5c-1.2 1.2-1.2 3 0 4.2M15 9.5c1.2 1.2 1.2 3 0 4.2M10.5 13v6M13.5 13v6M10.5 16h3"/>',
    root: TOOTH + '<path d="M10.6 7.2c-1 .9-1.1 2.5-.2 3.6M13.4 7.2c1 .9 1.1 2.5.2 3.6"/>',
    kids: TOOTH + '<path d="M17.5 3.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
    clean:
      '<path d="M12 2.7S6.5 5.5 6.5 10.2c0 2.9 2.2 4.6 2.2 4.6l1.1 4.7c.3 1.4 2.1 1.4 2.4 0l1.1-4.7s2.2-1.7 2.2-4.6C15.5 5.5 12 2.7 12 2.7z"/><path d="M12 2.7v9.8"/>',
    emergency: TOOTH + '<path d="M12 7v4M12 13.5v.6"/>',
  }
  function iconSpan(key) {
    var span = make('span', 'ic')
    span.innerHTML =
      '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#A8841C" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      (PATHS[key] || PATHS.tooth) +
      '</svg>'
    return span
  }

  /* ---------- الاستعلام ---------- */
  var QUERY = [
    '{',
    '"settings": *[_type == "siteSettings"][0]{',
    'clinicName, tagline, logo, heroTitle, heroSubtitle, heroImage, heroHighlights,',
    'aboutTitle, aboutBody, aboutImage, stats,',
    'phone, whatsapp, email, addressLine, mapsUrl, mapEmbedUrl, openingHours, socialLinks,',
    'sectionHeadings, seo',
    '},',
    '"services": *[_type == "service" && isActive == true]|order(order asc){',
    '_id, title, summary, icon, showInBookingForm',
    '},',
    '"cases": *[_type == "caseStudy" && isPublished == true]|order(order asc){',
    '_id, title, description, sessions, beforeImage, afterImage, "serviceTitle": service->title',
    '},',
    '"gallery": *[_type == "galleryItem" && isActive == true]|order(order asc){',
    '_id, image, caption',
    '}',
    '}',
  ].join(' ')

  function fetchContent() {
    var url =
      'https://' +
      encodeURIComponent(CONFIG.projectId) +
      '.api.sanity.io/v' +
      encodeURIComponent(CONFIG.apiVersion) +
      '/data/query/' +
      encodeURIComponent(CONFIG.dataset) +
      '?perspective=published&query=' +
      encodeURIComponent(QUERY) +
      '&t=' +
      Date.now()
    return fetch(url, {headers: {Accept: 'application/json'}, cache: 'no-store'})
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status)
        return r.json()
      })
      .then(function (j) {
        return j.result || {}
      })
  }

  /* ---------- الإعدادات العامة ---------- */
  function renderSettings(s) {
    if (!s) return
    var seo = s.seo || {}
    var name = s.clinicName || ''

    if (seo.metaTitle) document.title = seo.metaTitle
    else if (name) document.title = name
    if (seo.metaDescription) {
      var md = $('meta[name="description"]')
      if (md) md.setAttribute('content', seo.metaDescription)
    }
    setText('#cprName', name)
    setText('#footDesc', s.tagline)

    /* الواجهة */
    setText('#heroBadge', s.tagline ? name + ' — ' + s.tagline : name)
    if (s.heroTitle) {
      setText('#heroT1', s.heroTitle)
      var t2 = $('#heroT2')
      if (t2) t2.textContent = ''
    }
    setText('#heroSub', s.heroSubtitle)
    setDataImg('hero', s.heroImage, 900, 1200, true)

    if (Array.isArray(s.heroHighlights) && s.heroHighlights.length) {
      var trust = $('.hero .trust')
      if (trust) {
        clear(trust)
        s.heroHighlights.forEach(function (t) {
          var li = document.createElement('li')
          li.innerHTML =
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C9A227" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg> '
          li.appendChild(document.createTextNode(String(t)))
          trust.appendChild(li)
        })
      }
    }

    /* من نحن */
    setText('#aboutTitle', s.aboutTitle)
    var paras = blocksToParagraphs(s.aboutBody)
    if (paras.length) {
      var p1 = $('#aboutP1')
      var p2 = $('#aboutP2')
      if (p1) p1.textContent = paras[0]
      if (p2) {
        p2.textContent = paras[1] || ''
        while (p2.nextElementSibling && p2.nextElementSibling.dataset && p2.nextElementSibling.dataset.orasExtra) {
          p2.parentNode.removeChild(p2.nextElementSibling)
        }
        var after = p2
        paras.slice(2).forEach(function (t) {
          var p = make('p', null, t)
          p.dataset.orasExtra = '1'
          p.style.marginTop = '14px'
          after.parentNode.insertBefore(p, after.nextSibling)
          after = p
        })
      }
    }
    setDataImg('about', s.aboutImage, 900, null, false)

    /* الأرقام */
    if (Array.isArray(s.stats) && s.stats.length) {
      setText('#aboutYears', s.stats[0].value)
      setText('#aboutYearsLabel', s.stats[0].label)
      var band = $('#statsBand')
      if (band) {
        clear(band)
        s.stats.forEach(function (st) {
          var d = make('div', 'stat')
          d.appendChild(make('b', null, st && st.value))
          d.appendChild(make('span', null, st && st.label))
          band.appendChild(d)
        })
      }
    }

    /* التواصل */
    var wa = digits(s.whatsapp)
    if (s.phone) {
      ;['#heroPhone', '#sidePhone', '#footPhone'].forEach(function (sel) {
        setText(sel, s.phone)
      })
    }
    setText('#waNumber', wa ? '+' + wa : s.phone)
    if (wa) {
      window.__WA__ = wa
      var link = 'https://wa.me/' + wa
      var msg = function (t) {
        return link + '?text=' + encodeURIComponent(t)
      }
      var d1 = $('#waDirect')
      if (d1) d1.setAttribute('href', msg('مرحباً، أرغب بحجز موعد في ' + (name || 'العيادة') + '.'))
      var d2 = $('#fabWa')
      if (d2) d2.setAttribute('href', msg('مرحباً، أرغب بالاستفسار عن خدمات ' + (name || 'العيادة') + '.'))
      var d3 = $('#footWa')
      if (d3) d3.setAttribute('href', link)
    }

    if (s.email) {
      var mail = $('#footMail')
      if (mail) {
        clear(mail)
        var a = make('a', null, s.email)
        a.setAttribute('href', 'mailto:' + s.email)
        mail.appendChild(a)
      }
    }

    var addr = String(s.addressLine || '').trim()
    if (addr) {
      setText('#footAddr', addr.replace(/\s*\n\s*/g, ' — '))
      var lines = addr.split(/\n/)
      if (lines.length > 1) {
        setText('#addrTitle', lines[0].trim())
        setText('#addrSub', lines.slice(1).join(' ').trim())
      } else {
        var parts = addr.split(/[،,]/)
        setText('#addrTitle', parts[0].trim())
        if (parts.length > 1) setText('#addrSub', parts.slice(1).join('، ').trim())
      }
    }

    /* الخريطة */
    var embed = safeUrl(s.mapEmbedUrl)
    var fr = $('#mapIframe')
    if (fr && embed && /^https:\/\/(www\.)?google\.[a-z.]+\//i.test(embed)) fr.setAttribute('src', embed)
    else if (fr && addr)
      fr.setAttribute(
        'src',
        'https://www.google.com/maps?q=' + encodeURIComponent(addr.replace(/\n/g, ' ')) + '&z=15&hl=ar&output=embed'
      )
    var dl = $('#dirLink')
    var mapsUrl = safeUrl(s.mapsUrl)
    if (dl) {
      if (mapsUrl) dl.setAttribute('href', mapsUrl)
      else if (addr)
        dl.setAttribute(
          'href',
          'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(addr.replace(/\n/g, ' '))
        )
    }

    /* أوقات العمل */
    var hours = Array.isArray(s.openingHours) ? s.openingHours : []
    if (hours[0]) {
      setText('#hoursWeekLabel', hours[0].days)
      setText('#hoursWeek', hours[0].hours)
      setText('#footHours', [hours[0].days, hours[0].hours].filter(Boolean).join(': '))
    }
    if (hours[1]) {
      setText('#hoursFriLabel', hours[1].days)
      setText('#hoursFri', hours[1].hours)
    }
    if (addr || hours[0]) {
      var bar = []
      if (addr) bar.push('📍 ' + addr.replace(/\s*\n\s*/g, ' — '))
      if (hours[0]) bar.push('🕘 ' + [hours[0].days, hours[0].hours].filter(Boolean).join(': '))
      setText('#mapBarLine', bar.join(' • '))
    }

    /* روابط التواصل الاجتماعي */
    if (Array.isArray(s.socialLinks) && s.socialLinks.length) {
      var anchors = $$('.socials a').filter(function (a) {
        return a.id !== 'footWa'
      })
      var used = 0
      s.socialLinks.forEach(function (l) {
        var href = safeUrl(l && l.url)
        if (!href) return
        var label = String((l && l.label) || '')
        var target = null
        anchors.some(function (a) {
          var aria = a.getAttribute('aria-label') || ''
          if (label && aria && (label.indexOf(aria) > -1 || aria.indexOf(label) > -1)) {
            target = a
            return true
          }
          return false
        })
        if (!target) target = anchors[used]
        if (target) {
          target.setAttribute('href', href)
          target.setAttribute('target', '_blank')
          target.setAttribute('rel', 'noopener')
          if (label) target.setAttribute('aria-label', label)
          used = anchors.indexOf(target) + 1
        }
      })
    }

    /* عناوين الأقسام */
    var h = s.sectionHeadings || {}
    setText('#srvTitle', h.servicesTitle)
    setText('#srvLead', h.servicesIntro)
    setText('#caseTitle', h.casesTitle)
    setText('#caseLead', h.casesIntro)
    setText('#galTitle', h.galleryTitle)
    setText('#galLead', h.galleryIntro)
    setText('#bookTitle', h.appointmentTitle)
    setText('#bookLead', h.appointmentIntro)
  }

  /* ---------- الخدمات ---------- */
  function renderServices(list) {
    if (!list || !list.length) return
    var grid = $('#srvGrid')
    if (grid) {
      clear(grid)
      list.forEach(function (s) {
        var card = make('div', 'srv reveal in')
        card.appendChild(iconSpan(s.icon))
        card.appendChild(make('h3', null, s.title))
        card.appendChild(make('p', null, s.summary))
        grid.appendChild(card)
      })
    }
    var sel = $('#fService')
    if (sel) {
      clear(sel)
      sel.appendChild(make('option', null, 'فحص وتشخيص عام'))
      list.forEach(function (s) {
        if (s.showInBookingForm === false) return
        sel.appendChild(make('option', null, s.title))
      })
      sel.appendChild(make('option', null, 'حالة طارئة / ألم'))
    }
  }

  /* ---------- حالات قبل وبعد ---------- */
  var KNOB =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/></svg>'

  function renderCases(list) {
    var grid = $('#caseGrid')
    if (!grid || !list || !list.length) return
    clear(grid)
    list.forEach(function (c) {
      var art = make('article', 'case reveal in')
      var ba = make('div', 'ba')
      ba.setAttribute('data-ba', '')
      ba.appendChild(imgEl(c.beforeImage, 'قبل — ' + (c.title || ''), 800, 600, true))
      var afterWrap = make('div', 'ba-after')
      afterWrap.appendChild(imgEl(c.afterImage, 'بعد — ' + (c.title || ''), 800, 600, true))
      ba.appendChild(afterWrap)
      ba.appendChild(make('div', 'ba-line'))
      var knob = make('div', 'ba-knob')
      knob.innerHTML = KNOB
      ba.appendChild(knob)
      ba.appendChild(make('span', 'ba-tag tag-a', 'بعد'))
      ba.appendChild(make('span', 'ba-tag tag-b', 'قبل'))
      ba.appendChild(make('span', 'ba-hint', 'اسحب يميناً ويساراً'))
      art.appendChild(ba)

      var body = make('div', 'case-body')
      body.appendChild(make('h3', null, c.title))
      body.appendChild(make('p', null, c.description))
      var meta = make('div', 'case-meta')
      if (c.sessions) meta.appendChild(make('span', 'chip', '⏱ ' + c.sessions))
      if (c.serviceTitle) meta.appendChild(make('span', 'chip', c.serviceTitle))
      if (meta.childNodes.length) body.appendChild(meta)
      art.appendChild(body)
      grid.appendChild(art)
    })
    if (typeof window.bindBA === 'function') window.bindBA()
  }

  /* ---------- معرض الصور ---------- */
  function renderGallery(list) {
    var grid = $('#galGrid')
    if (!grid || !list || !list.length) return
    clear(grid)
    list.forEach(function (g) {
      var fig = make('figure', 'gal-item reveal in')
      var alt = (g.image && g.image.alt) || g.caption || 'صورة من العيادة'
      fig.appendChild(imgEl(g.image, alt, 700, 700, true))
      if (g.caption) fig.appendChild(make('figcaption', null, g.caption))
      grid.appendChild(fig)
    })
  }

  /* ---------- التشغيل ---------- */
  function apply(data) {
    renderSettings(data.settings)
    renderServices(data.services || [])
    renderCases(data.cases || [])
    renderGallery(data.gallery || [])
    document.documentElement.setAttribute('data-oras-cms', 'ready')
  }

  function load() {
    return fetchContent()
      .then(apply)
      .catch(function (err) {
        console.warn('تعذر جلب المحتوى من لوحة التحكم — يُعرض المحتوى الافتراضي:', err.message)
      })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load)
  else load()

  if (CONFIG.refreshOnFocus) {
    var last = Date.now()
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && Date.now() - last > 5000) {
        last = Date.now()
        load()
      }
    })
  }

  window.orasSanityReload = load
})()
