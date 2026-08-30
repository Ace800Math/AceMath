// ==========================================================================
// МАТЕМАТИЧЕСКАЯ РАЗМЕТКА (render + toolbar helpers)
// ==========================================================================
// Простой синтаксис, который можно печатать обычным текстом в вопросах,
// вариантах ответа и объяснениях — при показе ученику он превращается в
// нормально выглядящую математику (корень, дробь, степень, знак умножения,
// градус). Полный список — смотри README-комментарий внизу файла.
//
// sqrt(...) и frac(...,...) разбираются честным парсером со счётчиком
// скобок, а не регуляркой — поэтому внутри можно писать что угодно, в том
// числе свои скобки и вложенные sqrt/frac: sqrt(x+(1)), frac(sqrt(4),2),
// sqrt(frac(1,2)) и т.д.

(function () {

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Базовые замены (степень, умножение, градус, число пи) — применяются к
  // обычному тексту, который не попал внутрь sqrt(...)/frac(...,...)/root(...,...).
  function applyBasics(s) {
    // >= -> ≥, <= -> ≤. ВАЖНО: applyBasics вызывается уже ПОСЛЕ escapeHtml,
    // поэтому в строке на этот момент не ">=" и "<=", а "&gt;=" и "&lt;="
    // (escapeHtml успел заменить символы < и > на HTML-сущности раньше).
    s = s.replace(/&gt;=/g, '&ge;');
    s = s.replace(/&lt;=/g, '&le;');
    // число пи: отдельное слово "pi" (не часть другого слова вроде "opinion")
    s = s.replace(/\bpi\b/g, '<span class="am-pi">&pi;</span>');
    // степень с фигурными скобками: x^{16}
    s = s.replace(/\^\{([^{}]+)\}/g, '<sup class="am-sup">$1</sup>');
    // степень без скобок: x^2 (только один символ/цифра сразу после ^)
    s = s.replace(/\^([A-Za-z0-9])/g, '<sup class="am-sup">$1</sup>');
    // умножение: * -> ×
    s = s.replace(/\s*\*\s*/g, ' <span class="am-times">&times;</span> ');
    // градус: ° -> маленький жирный кружок сверху
    s = s.replace(/°/g, '<sup class="am-deg">&deg;</sup>');
    return s;
  }

  // Находит индекс скобки ')', соответствующей открывающей '(' на позиции openIdx
  // (с учётом вложенных скобок). Возвращает -1, если скобка так и не закрылась.
  function findMatchingParen(s, openIdx) {
    let depth = 0;
    for (let j = openIdx; j < s.length; j++) {
      if (s[j] === '(') depth++;
      else if (s[j] === ')') {
        depth--;
        if (depth === 0) return j;
      }
    }
    return -1;
  }

  // Делит содержимое frac(...) на числитель/знаменатель по первой ЗАПЯТОЙ
  // ВЕРХНЕГО уровня (запятые внутри вложенных скобок не считаются разделителем).
  function splitTopLevelComma(s) {
    let depth = 0;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '(') depth++;
      else if (c === ')') depth--;
      else if (c === ',' && depth === 0) {
        return [s.slice(0, i), s.slice(i + 1)];
      }
    }
    return null;
  }

  // Собирает разметку корня: indexHtml — маленькая цифра степени корня
  // (null для обычного квадратного sqrt), contentRaw — необработанное
  // подкоренное выражение (будет прогнано через processSegment рекурсивно).
  function buildRadical(indexHtml, contentRaw) {
    const indexSpan = indexHtml ? '<span class="am-root-index">' + indexHtml + '</span>' : '';
    return '<span class="am-sqrt">' + indexSpan +
      '<span class="am-sqrt-tick"><svg viewBox="0 0 20 60" preserveAspectRatio="none">' +
      '<path d="M1,32 L7,58 L18,2" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg></span>' +
      '<span class="am-sqrt-content">' + processSegment(contentRaw) + '</span></span>';
  }

  // Рекурсивно обрабатывает фрагмент текста: ищет sqrt(...)/cbrt(...)/
  // root(...,...)/frac(...,...), а всё, что между ними — обычный текст —
  // прогоняет через applyBasics.
  function processSegment(s) {
    let result = '';
    let i = 0;

    while (i < s.length) {
      const isSqrt = s.startsWith('sqrt(', i);
      const isFrac = s.startsWith('frac(', i);
      const isCbrt = s.startsWith('cbrt(', i);
      const isRoot = s.startsWith('root(', i);

      if (isSqrt || isFrac || isCbrt || isRoot) {
        const openIdx = i + 4; // "sqrt"/"frac"/"cbrt"/"root" — все 4 буквы, индекс совпадает
        const closeIdx = findMatchingParen(s, openIdx);

        if (closeIdx === -1) {
          // скобка так и не закрылась — не пытаемся угадать, выводим как есть
          result += applyBasics(s.slice(i, openIdx + 1));
          i = openIdx + 1;
          continue;
        }

        const inner = s.slice(openIdx + 1, closeIdx);

        if (isSqrt) {
          result += buildRadical(null, inner);
        } else if (isCbrt) {
          result += buildRadical('3', inner);
        } else if (isRoot) {
          const parts = splitTopLevelComma(inner);
          if (!parts) {
            // нет запятой верхнего уровня — не похоже на "root(степень,выражение)"
            result += 'root(' + processSegment(inner) + ')';
          } else {
            result += buildRadical(processSegment(parts[0]), parts[1]);
          }
        } else {
          // frac
          const parts = splitTopLevelComma(inner);
          if (!parts) {
            // нет запятой верхнего уровня — не похоже на корректную дробь,
            // просто печатаем содержимое как есть, без разбивки
            result += 'frac(' + processSegment(inner) + ')';
          } else {
            result += '<span class="am-frac"><span class="am-frac-num">' + processSegment(parts[0]) +
              '</span><span class="am-frac-bar"></span><span class="am-frac-den">' + processSegment(parts[1]) +
              '</span></span>';
          }
        }

        i = closeIdx + 1;
        continue;
      }

      // ищем следующее вхождение sqrt(/frac(/cbrt(/root( от текущей позиции
      const candidates = [
        s.indexOf('sqrt(', i),
        s.indexOf('frac(', i),
        s.indexOf('cbrt(', i),
        s.indexOf('root(', i)
      ].filter(idx => idx !== -1);
      const next = candidates.length ? Math.min(...candidates) : -1;

      if (next === -1) {
        result += applyBasics(s.slice(i));
        i = s.length;
      } else {
        result += applyBasics(s.slice(i, next));
        i = next;
      }
    }

    return result;
  }

  function renderMath(rawText) {
    if (!rawText) return '';
    return processSegment(escapeHtml(rawText));
  }

  // Вставка токена в textarea/input на месте курсора (для кнопок-инструментов в админке)
  function insertMathToken(fieldId, before, after) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    const start = field.selectionStart || 0;
    const end = field.selectionEnd || 0;
    const value = field.value || '';
    const selected = value.slice(start, end);

    const newValue = value.slice(0, start) + before + selected + after + value.slice(end);
    field.value = newValue;
    field.focus();

    const cursorPos = selected
      ? start + before.length + selected.length + after.length
      : start + before.length;
    field.setSelectionRange(cursorPos, cursorPos);
  }

  window.renderMath = renderMath;
  window.insertMathToken = insertMathToken;

})();

/* ==========================================================================
   ШПАРГАЛКА ПО СИНТАКСИСУ (то же самое отправлено в чат):

   sqrt(16)          ->  √16                 (корень; скобки внутри — можно)
   sqrt(x+(1))       ->  √(x+(1))            (вложенные скобки — тоже можно)
   cbrt(8)           ->  кубический корень из 8 (маленькая тройка слева сверху)
   root(4,16)        ->  корень 4-й степени из 16 (первое число — степень корня)
   frac(1,2)         ->  дробь 1 над 2 с чертой
   frac(sqrt(4),2)   ->  дробь, где сверху корень
   sqrt(frac(1,2))   ->  корень из дроби
   x^2   или  6^6    ->  степень одним символом сразу после ^
   x^{16}            ->  степень из нескольких символов — в фигурных скобках
   *                 ->  ×  (знак умножения)
   °                 ->  маленький жирный градус сверху (можно печатать как обычно)
   pi                ->  π  (отдельное слово "pi", не часть другого слова)
   >=                ->  ≥  (больше или равно)
   <=                ->  ≤  (меньше или равно)
   ========================================================================== */
