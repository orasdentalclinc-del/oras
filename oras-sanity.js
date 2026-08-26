/*!
 * أوراس لطب الأسنان — واصل المحتوى مع لوحة التحكم
 * -------------------------------------------------------------
 * ملف واحد يُضاف للصفحة، مهمته:
 *  1) جلب المحتوى المنشور من لوحة التحكم وعرضه في الأقسام.
 *  2) إرسال طلبات المواعيد والتقييمات إلى اللوحة عبر وسيط آمن.
 *
 * لا يوجد أي مفتاح سري داخل هذا الملف — القراءة عامة، والكتابة تمر عبر الوسيط.
 */
(function () {
  'use strict'

  /* =========================================================
   * 1) الإعدادات — عدّل هذه القيم فقط
   * =======================================================*/
  var CONFIG = Object.assign(
    {
      projectId: 'upxb9w10', // معرف المشروع من لوحة Sanity
      dataset: 'production',
      apiVersion: '2026-08-01',
      // رابط الوسيط المسؤول عن استقبال النماذج (اتركه فارغًا لتبقى النماذج كما هي)
      submitEndpoint: '',
      revalidateSeconds: 60,
    },
    window.ORAS_SANITY_CONFIG || {}
  )

  var HAS_PROJECT = CONFIG.projectId && CONFIG.projectId !== 'YOUR_PROJECT_ID'

  /* =========================================================
   * 2) أدوات مساعدة آمنة
   * =======================================================*/
  function $(sel, root) {
    return (root || document).querySelector(sel)
  }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel))
  }

  /** يضع نصًا فقط — لا يسمح بأي وسوم قادمة من البيانات */
  function setText(sel, value, root) {
    if (value === undefined || value === null || value === '') return
    var el = typeof sel === 'string' ? $(sel, root) : sel
    if (el) el.textContent = String(value)
  }

  function el(tag, className, text) {
    var node = document.createElement(tag)
    if (className) node.className = className
    if (text !== undefined && text !== null) node.textContent = String(text)
    return node
  }

  /** يسمح فقط بروابط http/https/mailto/tel ويرفض أي شيء قابل للتنفيذ */
  function safeUrl(value) {
    if (!value) return ''
    var raw = String(value).trim()
    if (/^[#/]/.test(raw)) return raw
    if (/^(https?:|mailto:|tel:)/i.test(raw)) return raw
    return ''
  }

  /** يبني رابط صورة من مرجع Sanity دون مكتبات إضافية */
  function imageUrl(source, width, height) {
    var ref = source && source.asset && (source.asset._ref || source.asset._id)
    if (!ref) return ''
    var parts = String(ref).split('-') // image-<id>-<w>x<h>-<ext>
    if (parts.length < 4) return ''
    var id = parts[1]
    var dims = parts[2]
    var ext = parts[3]
    var url =
      'https://cdn.sanity.io/images/' +
      encodeURIComponent(CONFIG.projectId) +
      '/' +
      encodeURIComponent(CONFIG.dataset) +
      '/' +
      id +
      '-' +
      dims +
      '.' +
      ext
    var q = []
    if (width) q.push('w=' + width)
    if (height) q.push('h=' + height)
    q.push('fit=crop', 'auto=format', 'q=80')
    return url + '?' + q.join('&')
  }

  /** يحول النص الغني إلى فقرات نصية بسيطة */
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
      })
      .filter(Boolean)
  }

  function stars(n) {
    var count = Math.max(0, Math.min(5, Number(n) || 0))
    return '\u2605'.repeat(count) + '\u2606'.repeat(5 - count)
  }

  function formatDate(value) {
    if (!value) return ''
    try {
      return new Intl.DateTimeFormat('ar', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date(value))
    } catch (e) {
      return String(value).slice(0, 10)
    }
  }

  /* =========================================================
   * 3) الاستعلام الواحد لكل محتوى الصفحة
   * =======================================================*/
  var QUERY = [
    '{',
    '"settings": *[_type == "siteSettings"][0]{',
    'clinicName, tagline, logo, heroTitle, heroSubtitle, heroImage, heroHighlights,',
    'heroPrimaryCta, heroSecondaryCta, aboutTitle, aboutBody, aboutImage, stats,',
    'phone, whatsapp, email, addressLine, mapsUrl, mapEmbedUrl, openingHours, socialLinks,',
    'sectionHeadings, bookingSuccessMessage, reviewSuccessMessage, casesPrivacyNotice, seo',
    '},',
    '"services": *[_type == "service" && isActive == true]|order(order asc){',
    '_id, title, summary, icon, image, priceFrom, showInBookingForm, featured',
    '},',
    '"cases": *[_type == "caseStudy" && isPublished == true && consentGiven == true]|order(order asc){',
    '_id, title, description, sessions, beforeImage, afterImage, hideFaces,',
    '"serviceTitle": service->title',
    '},',
    '"reviews": *[_type == "review" && status == "approved"]|order(featured desc, submittedAt desc)[0...24]{',
    '_id, name, rating, comment, submittedAt, source, "serviceTitle": service->title',
    '},',
    '"gallery": *[_type == "galleryItem" && isActive == true]|order(order asc){',
    '_id, image, caption, category',
    '},',
    '"activities": *[_type == "activity" && isActive == true]|order(order asc){',
    '_id, title, kind, summary, image, status, startDate, endDate, location, registrationLink',
    '},',
    '"journey": *[_type == "journeyStep" && isActive == true]|order(stepNumber asc){',
    '_id, stepNumber, title, description',
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
    return fetch(url, {headers: {Accept: 'application/json'}})
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status)
        return res.json()
      })
      .then(function (json) {
        return json.result || {}
      })
  }

  /* =========================================================
   * 4) عرض المحتوى في الأقسام
   * =======================================================*/

  function renderSettings(s) {
    if (!s) return

    if (s.clinicName) {
      $$('[data-oras="clinicName"]').forEach(function (n) {
        n.textContent = s.clinicName
      })
    }

    if (s.heroTitle) {
      var heroTitleEl =
        $('#hero-title') ||
        $('[data-oras="heroTitle"]') ||
        $('.hero h1') ||
        $('header h1') ||
        $('h1')
      if (heroTitleEl) heroTitleEl.textContent = s.heroTitle
    }
    var heroLead = $('.hero .section-lead, .hero p.hero-lead, .hero-copy > p')
    if (heroLead && s.heroSubtitle) heroLead.textContent = s.heroSubtitle

    // أزرار الواجهة
    var heroButtons = $$('.hero .button')
    if (s.heroPrimaryCta && heroButtons[0]) {
      if (s.heroPrimaryCta.label) heroButtons[0].textContent = s.heroPrimaryCta.label
      var t1 = safeUrl(s.heroPrimaryCta.target)
      if (t1) heroButtons[0].setAttribute('href', t1)
    }
    if (s.heroSecondaryCta && heroButtons[1]) {
      if (s.heroSecondaryCta.label) heroButtons[1].textContent = s.heroSecondaryCta.label
      var t2 = safeUrl(s.heroSecondaryCta.target)
      if (t2) heroButtons[1].setAttribute('href', t2)
    }

    // من نحن
    setText('#about-title', s.aboutTitle)
    var aboutParas = blocksToParagraphs(s.aboutBody)
    if (aboutParas.length) {
      var aboutHolder = $('#about .experience-grid > div')
      if (aboutHolder) {
        var existing = $$(':scope > p', aboutHolder).filter(function (p) {
          return !p.classList.contains('eyebrow')
        })
        if (existing[0]) existing[0].textContent = aboutParas.join(' ')
      }
    }

    // عناوين الأقسام
    var h = s.sectionHeadings || {}
    setText('#services-title', h.servicesTitle)
    setText('#cases-title', h.casesTitle)
    setText('#reviews-title', h.reviewsTitle)
    setText('#gallery-title', h.galleryTitle)
    setText('#activities-title', h.activitiesTitle)
    setText('#care-title', h.journeyTitle)
    setText('#appointment-title', h.appointmentTitle)
    setText('#location-title', h.locationTitle)

    if (h.servicesIntro) setText('#services .section-lead', h.servicesIntro)
    if (h.casesIntro) setText('#cases .section-lead', h.casesIntro)
    if (h.galleryIntro) setText('#gallery .section-lead', h.galleryIntro)
    if (h.journeyIntro) setText('#care .section-lead', h.journeyIntro)
    if (h.appointmentIntro) setText('#appointment .section-lead', h.appointmentIntro)

    // تنبيه خصوصية الحالات
    if (s.casesPrivacyNotice) {
      var badge = $('#cases .privacy-badge')
      if (badge) {
        var svg = badge.querySelector('svg')
        badge.textContent = ' ' + s.casesPrivacyNotice
        if (svg) badge.insertBefore(svg, badge.firstChild)
      }
    }

    // الهاتف والبريد والموقع
    if (s.phone) {
      $$('a[href^="tel:"]').forEach(function (a, idx) {
        if (idx === 0) {
          a.setAttribute('href', 'tel:' + String(s.phone).replace(/\s+/g, ''))
          a.textContent = s.phone
        }
      })
    }
    if (s.mapsUrl) {
      var mapHref = safeUrl(s.mapsUrl)
      if (mapHref) {
        $$('.map-button, .review-map-link').forEach(function (a) {
          a.setAttribute('href', mapHref)
        })
      }
    }
    if (s.addressLine) {
      var locCopy = $('#location .location-copy p:not(.eyebrow)')
      if (locCopy) locCopy.textContent = s.addressLine
    }
    if (s.whatsapp) {
      $$('[data-oras="whatsapp"]').forEach(function (a) {
        a.setAttribute('href', 'https://wa.me/' + String(s.whatsapp).replace(/[^0-9]/g, ''))
      })
    }
  }

  function renderServices(services) {
    if (!Array.isArray(services) || !services.length) return
    var grid = $('#services .services-grid')

    if (grid) {
      grid.textContent = ''
      services.forEach(function (item) {
        var card = el('article', 'service-card reveal in-view')

        var img = imageUrl(item.image, 640, 420)
        if (img) {
          var figure = el('div', 'service-media')
          var image = el('img')
          image.src = img
          image.alt = (item.image && item.image.alt) || item.title || ''
          image.loading = 'lazy'
          figure.appendChild(image)
          card.appendChild(figure)
        }

        card.appendChild(el('h3', null, item.title || ''))
        if (item.summary) card.appendChild(el('p', null, item.summary))
        if (item.priceFrom) card.appendChild(el('p', 'service-price', item.priceFrom))

        var btn = el('button', 'service-link', 'اطلب استشارة')
        btn.type = 'button'
        btn.setAttribute('data-service', item.title || '')
        card.appendChild(btn)
        card.appendChild(el('span', 'service-shape'))
        grid.appendChild(card)
      })
      bindServiceButtons()
    }

    // قائمة الخدمات في نموذج الحجز
    var select = $('#service')
    var inForm = services.filter(function (s) {
      return s.showInBookingForm !== false
    })
    if (select && inForm.length) {
      select.textContent = ''
      var placeholder = el('option', null, 'اختر الخدمة')
      placeholder.value = ''
      placeholder.selected = true
      placeholder.disabled = true
      select.appendChild(placeholder)
      inForm.forEach(function (s) {
        var opt = el('option', null, s.title || '')
        opt.value = s.title || ''
        opt.setAttribute('data-id', s._id || '')
        select.appendChild(opt)
      })
      var general = el('option', null, 'استشارة عامة')
      general.value = 'استشارة عامة'
      select.appendChild(general)
    }
  }

  function bindServiceButtons() {
    var select = $('#service')
    $$('[data-service]').forEach(function (button) {
      button.addEventListener('click', function () {
        if (select) select.value = button.getAttribute('data-service') || ''
        var target = $('#appointment')
        if (target) target.scrollIntoView({behavior: 'smooth', block: 'start'})
      })
    })
  }

  function renderCases(cases) {
    var grid = $('#cases .cases-grid')
    if (!grid) return
    if (!Array.isArray(cases) || !cases.length) return // لا توجد حالات معتمدة → أبقِ النماذج التوضيحية

    grid.textContent = ''
    cases.forEach(function (item, i) {
      var card = el('article', 'case-card reveal in-view' + (i === 0 ? ' case-featured' : ''))

      var visual = el('div', 'case-visual case-photos')
      visual.appendChild(el('span', 'case-number', 'حالة ' + String(i + 1).padStart(2, '0')))

      var pair = el('div', 'case-pair')
      ;[
        {src: imageUrl(item.beforeImage, 620, 420), label: 'قبل'},
        {src: imageUrl(item.afterImage, 620, 420), label: 'بعد'},
      ].forEach(function (side) {
        if (!side.src) return
        var wrap = el('figure', 'case-side')
        var image = el('img')
        image.src = side.src
        image.alt = item.title ? item.title + ' — ' + side.label : side.label
        image.loading = 'lazy'
        if (item.hideFaces) image.style.objectPosition = 'center 60%'
        wrap.appendChild(image)
        wrap.appendChild(el('figcaption', null, side.label))
        pair.appendChild(wrap)
      })
      visual.appendChild(pair)
      card.appendChild(visual)

      var content = el('div', 'case-content')
      var topline = el('div', 'case-topline')
      topline.appendChild(el('span', 'case-type', item.serviceTitle || 'حالة علاجية'))
      if (item.sessions) topline.appendChild(el('span', null, item.sessions))
      content.appendChild(topline)
      content.appendChild(el('h3', null, item.title || ''))
      if (item.description) content.appendChild(el('p', null, item.description))
      var link = el('a', 'case-link', 'استفسر عن العلاج')
      link.setAttribute('href', '#appointment')
      content.appendChild(link)
      card.appendChild(content)

      grid.appendChild(card)
    })
  }

  function renderReviews(reviews) {
    var holder = $('#reviews .published-reviews')
    if (!holder) return
    var empty = $('#reviewsEmpty')

    if (!Array.isArray(reviews) || !reviews.length) return // أبقِ رسالة "لا توجد مراجعات"

    if (empty) empty.remove()
    var list = el('div', 'reviews-list')
    reviews.forEach(function (r) {
      var card = el('article', 'review-card')
      var head = el('div', 'review-card-head')
      head.appendChild(el('strong', null, r.name || 'مراجع'))
      var rate = el('span', 'review-stars', stars(r.rating))
      rate.setAttribute('aria-label', 'التقييم ' + (Number(r.rating) || 0) + ' من 5')
      head.appendChild(rate)
      card.appendChild(head)
      if (r.comment) card.appendChild(el('p', null, r.comment))
      var meta = [r.serviceTitle, formatDate(r.submittedAt)].filter(Boolean).join(' · ')
      if (meta) card.appendChild(el('span', 'review-meta', meta))
      list.appendChild(card)
    })
    holder.appendChild(list)

    // متوسط التقييم
    var avg =
      reviews.reduce(function (sum, r) {
        return sum + (Number(r.rating) || 0)
      }, 0) / reviews.length
    var headNote = $('#reviews .reviews-panel-head span')
    if (headNote) {
      headNote.textContent = 'متوسط ' + avg.toFixed(1) + ' من 5 · ' + reviews.length + ' مراجعة'
    }
  }

  function renderGallery(items) {
    var grid = $('#gallery .gallery-grid')
    if (!grid || !Array.isArray(items) || !items.length) return

    grid.textContent = ''
    items.forEach(function (item, i) {
      var src = imageUrl(item.image, 900, 620)
      if (!src) return
      var figure = el('figure', 'gallery-card reveal in-view' + (i === 0 ? ' gallery-card-wide' : ''))
      var visual = el('div', 'gallery-visual')
      visual.appendChild(el('span', 'gallery-index', String(i + 1).padStart(2, '0')))
      var image = el('img')
      image.src = src
      image.alt = (item.image && item.image.alt) || item.caption || 'صورة من العيادة'
      image.loading = 'lazy'
      visual.appendChild(image)
      figure.appendChild(visual)

      var caption = el('figcaption')
      if (item.category) caption.appendChild(el('span', 'gallery-tag', item.category))
      if (item.caption) caption.appendChild(el('h3', null, item.caption))
      figure.appendChild(caption)
      grid.appendChild(figure)
    })
  }

  function renderActivities(items) {
    var list = $('#activities .activity-list')
    if (!list || !Array.isArray(items) || !items.length) return

    var kindLabels = {course: 'دورة تدريبية', campaign: 'حملة توعية', event: 'فعالية'}
    var statusLabels = {upcoming: 'قريبًا', ongoing: 'جارٍ الآن', done: 'منتهٍ'}

    list.textContent = ''
    items.forEach(function (item) {
      var card = el('article', 'activity-card reveal in-view')

      var art = el('div', 'activity-art')
      art.appendChild(el('span', 'activity-status', statusLabels[item.status] || 'قريبًا'))
      var src = imageUrl(item.image, 640, 420)
      if (src) {
        var image = el('img')
        image.src = src
        image.alt = item.title || ''
        image.loading = 'lazy'
        art.appendChild(image)
      }
      card.appendChild(art)

      var body = el('div', 'activity-body')
      body.appendChild(el('span', 'activity-kind', kindLabels[item.kind] || 'نشاط'))
      body.appendChild(el('h3', null, item.title || ''))
      if (item.summary) body.appendChild(el('p', null, item.summary))

      var meta = [formatDate(item.startDate), item.location].filter(Boolean).join(' · ')
      if (meta) body.appendChild(el('span', 'activity-meta', meta))

      var href = safeUrl(item.registrationLink) || '#appointment'
      var action = el('a', 'activity-action', item.registrationLink ? 'سجل الآن' : 'استفسر عن النشاط')
      action.setAttribute('href', href)
      if (/^https?:/i.test(href)) {
        action.setAttribute('target', '_blank')
        action.setAttribute('rel', 'noopener noreferrer')
      }
      body.appendChild(action)
      card.appendChild(body)
      list.appendChild(card)
    })
  }

  function renderJourney(steps) {
    var holder = $('#care .journey')
    if (!holder || !Array.isArray(steps) || !steps.length) return

    holder.textContent = ''
    steps.forEach(function (step, i) {
      var item = el('article', 'journey-item')
      item.appendChild(
        el('span', 'journey-number', String(step.stepNumber || i + 1).padStart(2, '0'))
      )
      var box = el('div')
      box.appendChild(el('h3', null, step.title || ''))
      if (step.description) box.appendChild(el('p', null, step.description))
      item.appendChild(box)
      holder.appendChild(item)
    })
  }

  /* =========================================================
   * 5) إرسال النماذج إلى اللوحة (عبر الوسيط)
   * =======================================================*/
  function post(kind, payload) {
    return fetch(CONFIG.submitEndpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({kind: kind, data: payload}),
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status)
      return res.json().catch(function () {
        return {ok: true}
      })
    })
  }

  function wireBookingForm(settings) {
    var form = $('#bookingForm')
    if (!form || !CONFIG.submitEndpoint) return
    var message = $('#formMessage')

    // إلغاء المعالج التجريبي القديم باستنساخ النموذج
    var fresh = form.cloneNode(true)
    form.parentNode.replaceChild(fresh, form)
    form = fresh
    message = $('#formMessage')

    var dateInput = $('#date', form)
    if (dateInput) {
      var now = new Date()
      dateInput.min = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10)
    }
    bindServiceButtons()

    form.addEventListener('submit', function (event) {
      event.preventDefault()
      if (!form.checkValidity()) {
        form.reportValidity()
        return
      }
      var submitBtn = form.querySelector('button[type="submit"]')
      if (submitBtn) submitBtn.disabled = true
      if (message) {
        message.textContent = 'جارٍ إرسال طلبك...'
        message.classList.add('show')
      }

      var selected = $('#service', form)
      post('booking', {
        name: ($('#name', form) || {}).value,
        phone: ($('#phone', form) || {}).value,
        serviceName: selected ? selected.value : '',
        serviceId: selected && selected.selectedOptions[0]
          ? selected.selectedOptions[0].getAttribute('data-id') || ''
          : '',
        preferredDate: ($('#date', form) || {}).value,
        message: ($('#message', form) || {}).value,
      })
        .then(function () {
          if (message) {
            message.textContent =
              (settings && settings.bookingSuccessMessage) ||
              'تم إرسال طلبك بنجاح، سنتواصل معك قريبًا.'
          }
          form.reset()
        })
        .catch(function () {
          if (message) {
            message.textContent =
              'تعذر الإرسال الآن. يمكنك الاتصال بالعيادة مباشرة لتأكيد الموعد.'
          }
        })
        .then(function () {
          if (submitBtn) submitBtn.disabled = false
        })
    })
  }

  function wireReviewForm(settings) {
    var form = $('#reviewForm')
    if (!form || !CONFIG.submitEndpoint) return

    var fresh = form.cloneNode(true)
    form.parentNode.replaceChild(fresh, form)
    form = fresh

    var message = $('#reviewMessage')
    var ratingField = $('#reviewRating', form)
    var starButtons = $$('#ratingInput button', form)

    starButtons.forEach(function (star) {
      star.addEventListener('click', function () {
        var selected = Number(star.getAttribute('data-rating'))
        if (ratingField) ratingField.value = String(selected)
        starButtons.forEach(function (item) {
          var value = Number(item.getAttribute('data-rating'))
          item.classList.toggle('active', value <= selected)
          item.setAttribute('aria-checked', value === selected ? 'true' : 'false')
        })
      })
    })

    form.addEventListener('submit', function (event) {
      event.preventDefault()
      if (!ratingField || !ratingField.value) {
        if (message) {
          message.textContent = 'يرجى اختيار تقييمك بالنجوم أولًا.'
          message.classList.add('show')
        }
        if (starButtons[0]) starButtons[0].focus()
        return
      }
      if (!form.checkValidity()) {
        form.reportValidity()
        return
      }
      var submitBtn = form.querySelector('button[type="submit"]')
      if (submitBtn) submitBtn.disabled = true
      if (message) {
        message.textContent = 'جارٍ إرسال تقييمك...'
        message.classList.add('show')
      }

      post('review', {
        name: ($('#reviewName', form) || {}).value,
        rating: Number(ratingField.value),
        comment: ($('#reviewText', form) || {}).value,
      })
        .then(function () {
          if (message) {
            message.textContent =
              (settings && settings.reviewSuccessMessage) ||
              'شكرًا لك! سيظهر تقييمك بعد مراجعته.'
          }
          form.reset()
          ratingField.value = ''
          starButtons.forEach(function (item) {
            item.classList.remove('active')
            item.setAttribute('aria-checked', 'false')
          })
        })
        .catch(function () {
          if (message) {
            message.textContent = 'تعذر إرسال التقييم الآن، يرجى المحاولة لاحقًا.'
          }
        })
        .then(function () {
          if (submitBtn) submitBtn.disabled = false
        })
    })
  }

  /* =========================================================
   * 6) التشغيل
   * =======================================================*/
  function start() {
    if (!HAS_PROJECT) {
      console.warn('[أوراس] لم يُحدد معرف المشروع، الصفحة تعمل بمحتواها الأصلي.')
      return
    }
    document.documentElement.setAttribute('data-oras-cms', 'loading')

    fetchContent()
      .then(function (data) {
        renderSettings(data.settings)
        renderServices(data.services)
        renderCases(data.cases)
        renderReviews(data.reviews)
        renderGallery(data.gallery)
        renderActivities(data.activities)
        renderJourney(data.journey)
        wireBookingForm(data.settings)
        wireReviewForm(data.settings)
        document.documentElement.setAttribute('data-oras-cms', 'ready')
      })
      .catch(function (err) {
        document.documentElement.setAttribute('data-oras-cms', 'error')
        console.warn('[أوراس] تعذر جلب المحتوى:', err && err.message)
      })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start)
  } else {
    start()
  }
})()
