/*!
 * أوراس التعليمية — عرض الملفات من لوحة التحكم (Sanity)
 * ──────────────────────────────────────────────────────
 * يقرأ شبكة الملفات في الصفحة (العنصر #eduFiles ويحمل data-audience):
 *   data-audience="patients" → ملفات «دليل مرضى أوراس»
 *   data-audience="dentists" → ملفات «دليل أطباء الأسنان»
 *
 * يجلب الملفات المنشورة (educationFile) من مشروع Sanity المضبوط في
 * window.ORAS_SANITY_CONFIG ويعرضها كبطاقات: صورة/أيقونة + عنوان + وصف
 * + تصنيف + حجم الملف + زر «فتح الملف».
 *
 * • بدون محتوى منشور تبقى رسالة «قريباً» ظاهرة (الحالة الافتراضية).
 * • عند فشل الاتصال يبقى المحتوى الافتراضي ظاهراً — الصفحة لا تنكسر أبداً.
 * • لا يحتوي أي مفتاح سري — القراءة فقط.
 */
(function () {
  'use strict';

  var CONFIG = Object.assign(
    {
      projectId: '',
      dataset: 'production',
      apiVersion: '2024-01-01',
    },
    window.ORAS_SANITY_CONFIG || {}
  );
  if (!CONFIG.projectId) return;

  var grid = document.getElementById('eduFiles');
  if (!grid) return;
  var audience = grid.getAttribute('data-audience') || 'patients';

  /* ---------- أدوات ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
    return n;
  }

  function fileSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function fileDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('ar', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return '';
    }
  }

  function extBadge(ext, mime) {
    var e = String(ext || '').toLowerCase();
    if (!e && mime) {
      var m = String(mime).split('/')[1] || '';
      e = m.replace('jpeg', 'jpg');
    }
    return e ? e.toUpperCase() : 'ملف';
  }

  /* أيقونة حسب نوع الملف (عند عدم وجود صورة مصغّرة) */
  function typeIcon(ext) {
    var e = String(ext || '').toLowerCase();
    var paths =
      '<path d="M14 3v5h5"/><path d="M5 3h9l5 5v13H5z"/><path d="M9 13h6M9 17h6"/>';
    if (e === 'pdf') paths = '<path d="M14 3v5h5"/><path d="M5 3h9l5 5v13H5z"/><path d="M8.5 14.5h2a1.2 1.2 0 0 1 0 2.4h-2v-2.4zM13.5 14.5h1.5a1.5 1.5 0 0 1 0 3h-1.5"/>';
    else if (['doc', 'docx'].indexOf(e) >= 0) paths = '<path d="M14 3v5h5"/><path d="M5 3h9l5 5v13H5z"/><path d="M8 13h8M8 16h8M8 19h5"/>';
    else if (['ppt', 'pptx'].indexOf(e) >= 0) paths = '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M12 17v3M8 20h8"/>';
    else if (['xls', 'xlsx', 'csv'].indexOf(e) >= 0) paths = '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>';
    else if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].indexOf(e) >= 0) paths = '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M4 18l5-5 3 3 3-2 5 4"/>';
    else if (['mp4', 'webm', 'mov'].indexOf(e) >= 0) paths = '<rect x="3" y="5" width="14" height="14" rx="2"/><path d="M17 10l4-2.5v9L17 14"/>';
    else if (['mp3', 'wav', 'ogg', 'm4a'].indexOf(e) >= 0) paths = '<circle cx="7" cy="17" r="3"/><circle cx="17" cy="15" r="3"/><path d="M10 17V6l10-2v11"/>';
    return (
      '<svg class="ftype" viewBox="0 0 24 24" fill="none" stroke="#FFFDF6" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      paths +
      '</svg>'
    );
  }

  /* ---------- الاستعلام ---------- */
  var QUERY =
    '*[_type == "educationFile" && audience == "' +
    String(audience).replace(/[^a-z]/g, '') +
    '" && isActive != false] | order(order asc, publishedAt desc) {' +
    '_id, title, description, category, linkUrl, publishedAt,' +
    '"fileUrl": file.asset->url, "fileSize": file.asset->size,' +
    '"fileName": file.asset->originalFilename, "ext": file.asset->extension,' +
    '"mime": file.asset->mimeType, "thumbUrl": thumbnail.asset->url' +
    '}';

  function fetchFiles() {
    var url =
      'https://' +
      encodeURIComponent(CONFIG.projectId) +
      '.api.sanity.io/v' +
      encodeURIComponent(CONFIG.apiVersion) +
      '/data/query/' +
      encodeURIComponent(CONFIG.dataset) +
      '?perspective=published&query=' +
      encodeURIComponent(QUERY);
    return fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) {
          var e = new Error('HTTP ' + r.status);
          e.status = r.status;
          throw e;
        }
        return r.json();
      })
      .then(function (j) {
        return j.result || [];
      });
  }

  /* ---------- العرض ---------- */
  function renderCard(item) {
    var ext = item.ext || '';
    var url = item.fileUrl || item.linkUrl || '';
    var card = el('a', 'file-card');
    card.href = url || '#';
    if (url) {
      card.target = '_blank';
      card.rel = 'noopener';
    }

    /* الصورة المصغّرة أو أيقونة النوع */
    var thumb = el('div', 'file-thumb');
    if (item.thumbUrl) {
      var img = el('img');
      img.src = item.thumbUrl + (item.thumbUrl.indexOf('?') >= 0 ? '&' : '?') + 'w=640&auto=format&q=75';
      img.alt = item.title || 'صورة الملف';
      img.loading = 'lazy';
      thumb.appendChild(img);
    } else {
      thumb.innerHTML = typeIcon(ext);
    }
    if (item.fileUrl) {
      thumb.appendChild(el('span', 'ext-badge', extBadge(ext, item.mime)));
    } else {
      thumb.appendChild(el('span', 'ext-badge', 'رابط'));
    }
    card.appendChild(thumb);

    /* المتن */
    var body = el('div', 'file-body');
    body.appendChild(el('h3', null, item.title || 'ملف تعليمي'));
    if (item.description) body.appendChild(el('p', null, item.description));

    var meta = el('div', 'file-meta');
    if (item.category) meta.appendChild(el('span', 'chip', item.category));
    var bits = [];
    if (item.fileSize) bits.push(fileSize(item.fileSize));
    var d = fileDate(item.publishedAt);
    if (d) bits.push(d);
    if (bits.length) meta.appendChild(el('small', null, bits.join(' · ')));
    if (meta.childNodes.length) body.appendChild(meta);

    var cta = el('span', 'file-open', item.fileUrl ? 'فتح / تحميل الملف ↗' : 'فتح الرابط ↗');
    body.appendChild(cta);
    card.appendChild(body);
    return card;
  }

  function render(items) {
    var empty = document.getElementById('eduEmpty');
    if (!items || !items.length) return; /* تبقى رسالة «قريباً» */
    if (empty && empty.parentNode) empty.parentNode.removeChild(empty);
    items.forEach(function (it) {
      grid.appendChild(renderCard(it));
    });
  }

  function init() {
    fetchFiles().then(render).catch(function () {
      /* فشل الجلب/الشبكة: تبقى رسالة «قريباً» ظاهرة — لا رسائل خطأ للزوار */
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
