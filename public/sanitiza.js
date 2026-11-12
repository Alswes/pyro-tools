/* Pyro Tools · proteção contra HTML/script injetado (XSS).
   Todo HTML montado pelas telas passa por aqui: tira <script>, <iframe>, atributos on… (onerror, onclick…)
   e links javascript:. Assim um nome de fornecedor, descrição de item ou planilha maliciosa não executa código. */
(function (w) {
  'use strict';
  if (w.__pyroSanit) return; w.__pyroSanit = 1;
  const P = w.Element && w.Element.prototype; if (!P) return;
  const D = Object.getOwnPropertyDescriptor(P, 'innerHTML'), O = Object.getOwnPropertyDescriptor(P, 'outerHTML'), IA = P.insertAdjacentHTML;
  if (!D || !D.set) return;
  const OK_ON = /^try\{parent\.pyroNav\('home'\)\}catch\(e\)\{\}return false;?$/;
  const SUSP = /\son[a-z]+\s*=|<\s*(script|object|embed|base|meta|link)\b|javascript:|srcdoc/i;
  const doc = w.document;
  function limpa(html) {
    html = html == null ? '' : String(html);
    if (html.indexOf('<') < 0 || !SUSP.test(html)) return html;
    const t = doc.createElement('template'); D.set.call(t, html);
    t.content.querySelectorAll('script,object,embed,base,meta,link').forEach(n => n.remove());
    t.content.querySelectorAll('*').forEach(el => {
      for (const a of Array.from(el.attributes)) {
        const n = a.name.toLowerCase(), v = a.value;
        if (n.startsWith('on') && !OK_ON.test(v.trim())) el.removeAttribute(a.name);
        else if (/^(href|src|xlink:href|action|formaction|data)$/.test(n) && /^\s*(javascript|vbscript):/i.test(v)) el.removeAttribute(a.name);
        else if (n === 'srcdoc') el.removeAttribute(a.name);
      }
    });
    return D.get.call(t);
  }
  Object.defineProperty(P, 'innerHTML', { configurable: true, enumerable: D.enumerable, get: D.get, set(v) { D.set.call(this, this instanceof w.HTMLTemplateElement ? v : limpa(v)); } });
  if (O && O.set) Object.defineProperty(P, 'outerHTML', { configurable: true, enumerable: O.enumerable, get: O.get, set(v) { O.set.call(this, limpa(v)); } });
  P.insertAdjacentHTML = function (pos, html) { return IA.call(this, pos, limpa(html)); };
  w.pyroLimpaHTML = limpa;
})(window);
