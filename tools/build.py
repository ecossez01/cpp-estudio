#!/usr/bin/env python3
"""Convierte los resúmenes (tools/src/*.md) y los tests (tools/quizzes/*.json)
en los archivos de datos de la app (data/*.js), y genera assets.js y sw.js.

Uso:  python3 tools/build.py
Requisitos: Python 3 con el paquete `markdown`. Opcional: Node con `npm install`
dentro de tools/ para dibujar las fórmulas con KaTeX (si no, salen como texto).
"""
import hashlib
import html
import json
import math
import random
import re
import shutil
import subprocess
from pathlib import Path

import markdown

ROOT = Path(__file__).resolve().parent.parent
TOOLS = ROOT / "tools"
SRC = TOOLS / "src"
QUIZ = TOOLS / "quizzes"
DATA = ROOT / "data"

# Orden de los tomos de Protection of Assets.
DOMAINS = [
    {"id": "business", "title": "Business Principles", "es": "Principios de negocio"},
    {"id": "physical", "title": "Physical Security", "es": "Seguridad física"},
    {"id": "personnel", "title": "Personnel", "es": "Seguridad del personal"},
    {"id": "investigations", "title": "Investigations", "es": "Investigaciones"},
    {"id": "crisis", "title": "Crisis Management", "es": "Gestión de crisis"},
    {"id": "security", "title": "Security Management", "es": "Gestión de la seguridad"},
]

CH_RE = re.compile(r"^## Capítulo (\d+) — (.+?)(?: \(págs\. ([^)]+)\))?\s*$")
AP_RE = re.compile(r"^## (Apéndices?)(?: ([A-Z]))?\b\s*(.*?)(?: \(págs\. ([^)]+)\))?\s*$")
# Marcas de cada idioma en los resúmenes (tools/src/<tomo>.md y tools/src/en/<tomo>.md).
LANG = {
    "es": {"ojo": "Ojo para el examen:", "idea": "**Idea central:**", "skip": "preguntas de repaso"},
    "en": {"ojo": "Exam note:", "idea": "**Central idea:**", "skip": "review questions"},
}


def ojo_re(label):
    return re.compile(r"^\s*(?:-\s*)?(?:\*\*)?" + re.escape(label) + r"(?:\*\*)?\s*(.*)$")


OJO_RE = ojo_re(LANG["es"]["ojo"])
LATEX_RE = re.compile(r"```latex\n(.*?)\n```", re.S)

KATEX = {}  # tex -> html (se llena en main)


# ---------- fórmulas ----------
def latex_to_text(tex: str) -> str:
    """Respaldo sin KaTeX: convierte la fórmula a texto legible."""
    t = tex.strip().replace("{,}", ",").replace("{:}", ":")
    t = re.sub(r"\\sum_\{([^}]*)\}\^\{([^}]*)\}", r"Σ[\1…\2] ", t)
    t = t.replace("\\left(", "(").replace("\\right)", ")").replace("\\left[", "[").replace("\\right]", "]")
    for _ in range(5):
        t = re.sub(r"\\(?:text|mathrm)\{([^{}]*)\}", r"\1", t)
        t = re.sub(r"\\t?frac\{([^{}]*)\}\{([^{}]*)\}", r"(\1) ÷ (\2)", t)
    t = (t.replace("\\qquad", "   ·   ").replace("\\quad", "  ").replace("\\times", "×").replace("\\%", "%")
         .replace("\\approx", "≈").replace("\\Rightarrow", "⇒").replace("\\propto", "∝").replace("\\sqrt", "√")
         .replace("\\sum", "Σ").replace("\\prod", "Π").replace("\\rho", "ρ").replace("\\Phi", "Φ")
         .replace("\\;", " ").replace("\\,", " ").replace("\\ ", " ").replace("\\max", "max").replace("\\min", "min"))
    t = re.sub(r"\^\{([^}]*)\}", r"<sup>\1</sup>", t)
    t = re.sub(r"_\{([^}]*)\}", r"<sub>\1</sub>", t)
    t = re.sub(r"_([A-Za-z0-9])", r"<sub>\1</sub>", t)
    t = re.sub(r"Σ\[([^\]]*)\]", r"Σ<sub>\1</sub>", t)
    t = t.replace(" - ", " − ")
    return re.sub(r"\s+", " ", t).strip()


def formula_html(tex: str) -> str:
    rendered = KATEX.get(tex.strip())
    if rendered:
        return f'<div class="formula katex-block">{rendered}</div>'
    return f'<div class="formula">{latex_to_text(tex)}</div>'


# ---------- markdown ----------
def fix_markdown(md: str, lang="es") -> str:
    lab = re.escape(LANG[lang]["ojo"])
    md = re.sub(r"(?m)^  (?=(\d+\.|-) )", "    ", md)  # listas anidadas con 2 espacios
    md = md.replace("\\~", "~")  # «\~» que dejó la exportación
    md = LATEX_RE.sub(lambda m: "\n" + formula_html(m.group(1)) + "\n", md)
    md = re.sub(r"(?m)^(\s*(?:-\s*)?)(?:\*\*)?" + lab + r"(?:\*\*)?", lambda m: m.group(1) + "**" + LANG[lang]["ojo"] + "**", md)
    return md


def md_to_html(md: str, lang="es") -> str:
    lab = LANG[lang]["ojo"]
    out = markdown.markdown(fix_markdown(md, lang), extensions=["tables", "sane_lists"])
    out = out.replace("<table>", '<div class="tw"><table>').replace("</table>", "</table></div>")
    out = re.sub(r"<(li|p)><strong>" + re.escape(lab) + "</strong>",
                 lambda m: f'<{m.group(1)} class="ojo"><strong>{lab}</strong>', out)
    return out


def md_inline(text: str) -> str:
    h = markdown.markdown(text.strip())
    return h[3:-4] if h.startswith("<p>") and h.endswith("</p>") else h


def plain(text: str) -> str:
    """Markdown en línea -> texto plano."""
    t = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)
    t = re.sub(r"(\*\*|__|\*|_|`)", "", t)
    return re.sub(r"\s+", " ", t).strip()


def short_title(t: str) -> str:
    """'1.1 Gestión (Management)' -> '1.1 Gestión'."""
    s = re.sub(r"\s*\((?:[^()]|\([^)]*\))*\)\s*$", "", t).strip()
    s = re.sub(r"\s+—\s+.*$", "", s) if re.match(r"^\d", s) and " — " in s and len(s) > 60 else s
    return s or t


def glossary_cards(lines):
    cards, in_tab = [], False
    for ln in lines:
        st = ln.strip()
        if st.startswith("| Término"):
            in_tab = True
            continue
        if in_tab:
            if not st.startswith("|"):
                in_tab = False
                continue
            cells = [c.strip() for c in re.split(r"(?<!\\)\|", st.strip("|"))]
            if set("".join(cells)) <= set("-: "):
                continue
            if len(cells) >= 2 and cells[0] and cells[-1]:
                term = cells[0] if len(cells) == 2 else f"{cells[0]} ({cells[1]})"
                cards.append({"q": f"¿Qué es «{term}»?", "a": cells[-1]})
    return cards


# ---------- tests automáticos ----------
def auto_quiz(cards, pool_domain, seed):
    """Opción múltiple a partir de las preguntas de repaso: la respuesta correcta y
    tres respuestas de otras preguntas del mismo capítulo (o del tomo si faltan),
    elegidas por parecido de forma (si llevan cifras y longitud). Guarda referencias
    a las fichas, así la app arma el test en el idioma elegido."""
    rng = random.Random(seed)
    out = []
    for card in cards:
        ans = plain(card["a"])
        has_d = bool(re.search(r"\d", ans))
        seen = {ans.lower()}
        cands = []
        for c in cards + pool_domain:
            t = plain(c["a"])
            if t.lower() in seen or not t:
                continue
            seen.add(t.lower())
            same_ch = c in cards
            score = (2.0 if bool(re.search(r"\d", t)) == has_d else 0) \
                - abs(math.log((len(t) + 5) / (len(ans) + 5))) + (1.5 if same_ch else 0) + rng.random() * 0.6
            cands.append((score, c["id"]))
        cands.sort(reverse=True)
        distract = [cid for _, cid in cands[:3]]
        if len(distract) < 3:
            continue
        out.append({"auto": 1, "k": card["id"], "d": distract})
    return out


# ---------- capítulos ----------
def split_chapters(md_text):
    lines = md_text.splitlines()
    intro, chapters, cur = [], [], None
    ap_count = 0
    for line in lines:
        m = CH_RE.match(line)
        a = AP_RE.match(line) if not m else None
        if m:
            cur = {"num": m.group(1), "label": f"Capítulo {m.group(1)}", "short": f"Cap. {m.group(1)}",
                   "title": m.group(2).strip(), "pages": m.group(3) or "", "lines": []}
            chapters.append(cur)
        elif a:
            ap_count += 1
            word, letter, rest, pages = a.group(1), a.group(2), (a.group(3) or "").strip(), a.group(4) or ""
            rest = re.sub(r"^—\s*", "", rest)
            if letter:
                label, short, num = f"Apéndice {letter}", f"Ap. {letter}", letter
            else:
                label, short = word, "Ap."
                num = "A" if ap_count == 1 else f"A{ap_count}"
            title = rest[:1].upper() + rest[1:] if rest else word
            cur = {"num": num, "label": label, "short": short, "title": title, "pages": pages, "lines": []}
            chapters.append(cur)
        elif cur is not None:
            cur["lines"].append(line)
        elif not line.startswith("# ") and not re.match(r"^\w{3} \d+, \d{4}", line):
            intro.append(line)
    return intro, chapters


def parse_domain(dom, md_text, quizzes):
    intro, chapters = split_chapters(md_text)
    out = []
    for ch in chapters:
        cid = f"{dom['id']}-{ch['num']}"
        idea, sections, pre = "", [], []
        for ln in ch["lines"]:
            if ln.startswith("### "):
                sections.append([ln[4:].strip(), []])
            elif sections:
                sections[-1][1].append(ln)
            elif ln.startswith("**Idea central:**") and not idea:
                idea = ln.replace("**Idea central:**", "").strip()
                ch["idea_md"] = idea
            else:
                pre.append(ln)

        cards, ojo, toc, parts = [], [], [], []
        words = len(" ".join(pre).split()) + sum(len(" ".join(sl).split()) for t, sl in sections
                                                  if not t.lower().startswith("preguntas de repaso"))
        if "\n".join(pre).strip():
            parts.append(md_to_html("\n".join(pre)))
            for ln in pre:
                mo = OJO_RE.match(ln)
                if mo:
                    ojo.append({"s": ch["title"], "h": md_inline(mo.group(1))})
        for n, (title, sl) in enumerate(sections):
            if title.lower().startswith("preguntas de repaso"):
                for ln in sl:
                    mm = re.match(r"^\s*\d+\.\s+(.*)$", ln)
                    if mm and " → " in mm.group(1):
                        q, a = mm.group(1).split(" → ", 1)
                        cards.append({"q": q.strip(), "a": a.strip()})
                continue
            for ln in sl:
                mo = OJO_RE.match(ln)
                if mo:
                    ojo.append({"s": short_title(title), "h": md_inline(mo.group(1))})
            sid = f"s{n}"
            toc.append({"id": sid, "t": short_title(title)})
            parts.append(f'<h3 id="{cid}-{sid}">{html.escape(title)}</h3>' + md_to_html("\n".join(sl)))
        if not cards:  # sin preguntas de repaso: usa las tablas de glosario («Término | …»)
            cards = glossary_cards(ch["lines"])
        for j, c in enumerate(cards):
            c["id"] = f"{cid}-k{j}"
        out.append({
            "id": cid, "num": ch["num"], "label": ch["label"], "short": ch["short"],
            "title": ch["title"], "pages": ch["pages"], "words": words,
            "idea": md_inline(idea) if idea else "",
            "toc": toc, "html": "".join(parts),
            "cards": cards, "ojo": ojo, "quiz": [],
        })

    all_cards = [c for ch in out for c in ch["cards"]]
    en = load_en(dom["id"])
    exp = {"cards": {}, "ideas": {}, "quiz": {}}
    for ch, raw in zip(out, chapters):
        hand = quizzes.get(ch["num"], [])
        if hand:
            ch["quiz"] = [{"q": q[0], "o": q[1], "c": q[2], "e": q[3]} for q in hand]
            for j, q in enumerate(ch["quiz"]):
                qid = f"{ch['id']}-q{j}"
                exp["quiz"][qid] = {"q": q["q"], "o": q["o"], "e": q["e"]}
                t = en["quiz"].get(qid)
                if t and len(t.get("o", [])) == len(q["o"]):
                    q.update({"qe": t["q"], "oe": t["o"], "ee": t.get("e", "")})
        elif ch["cards"]:
            others = [c for c in all_cards if c not in ch["cards"]]
            ch["quiz"] = auto_quiz(ch["cards"], others, ch["id"])
        if raw.get("idea_md"):
            exp["ideas"][ch["id"]] = raw["idea_md"]
            if en["ideas"].get(ch["id"]):
                ch["ideae"] = md_inline(en["ideas"][ch["id"]])
        # Fichas en HTML para mostrar negritas, cursivas, etc.
        cards_html = []
        for c in ch["cards"]:
            exp["cards"][c["id"]] = {"q": c["q"], "a": c["a"]}
            item = {"q": md_inline(c["q"]), "a": md_inline(c["a"])}
            t = en["cards"].get(c["id"])
            if t and t.get("q") and t.get("a"):
                item.update({"qe": md_inline(t["q"]), "ae": md_inline(t["a"])})
            cards_html.append(item)
        ch["cards"] = cards_html
    EXPORT[dom["id"]] = exp
    return {"id": dom["id"], "title": dom["title"], "es": dom["es"],
            "intro": md_to_html("\n".join(intro)).strip(), "chapters": out}


def parse_en_summary(dom, md_text):
    """Resumen en inglés (mismas cabeceras «## » que el español): {capítulo: {html, toc, ojo}}."""
    L = LANG["en"]
    ore = ojo_re(L["ojo"])
    _, chapters = split_chapters(md_text)
    out = {}
    for ch in chapters:
        cid = f"{dom['id']}-{ch['num']}"
        sections, pre = [], []
        for ln in ch["lines"]:
            if ln.startswith("### "):
                sections.append([ln[4:].strip(), []])
            elif sections:
                sections[-1][1].append(ln)
            elif ln.startswith(L["idea"]):
                continue
            else:
                pre.append(ln)
        ojo, toc, parts = [], [], []
        if "\n".join(pre).strip():
            parts.append(md_to_html("\n".join(pre), "en"))
            ojo += [{"s": ch["title"], "h": md_inline(mo.group(1))} for mo in map(ore.match, pre) if mo]
        for n, (title, sl) in enumerate(sections):
            if title.lower().startswith(L["skip"]):
                continue
            ojo += [{"s": short_title(title), "h": md_inline(mo.group(1))} for mo in map(ore.match, sl) if mo]
            sid = f"e{n}"
            toc.append({"id": sid, "t": short_title(title)})
            parts.append(f'<h3 id="{cid}-{sid}">{html.escape(title)}</h3>' + md_to_html("\n".join(sl), "en"))
        out[cid] = {"html": "".join(parts), "toc": toc, "ojo": ojo}
    return out


def load_en(dom_id):
    p = TOOLS / "i18n" / "en" / f"{dom_id}.json"
    base = {"cards": {}, "ideas": {}, "quiz": {}}
    if p.exists():
        base.update(json.loads(p.read_text("utf-8")))
    return base


EXPORT = {}


def render_all_latex():
    texts = sorted({m.group(1).strip() for f in [*SRC.glob("*.md"), *SRC.glob("en/*.md")] for m in LATEX_RE.finditer(f.read_text("utf-8"))})
    if not texts:
        return
    node = shutil.which("node")
    if not node or not (TOOLS / "node_modules" / "katex").exists():
        print("Aviso: sin KaTeX (ejecuta `npm install` en tools/); las fórmulas salen como texto.")
        return
    r = subprocess.run([node, str(TOOLS / "render_tex.js")], input=json.dumps(texts),
                       capture_output=True, text=True, cwd=TOOLS)
    if r.returncode == 0:
        KATEX.update({k: v for k, v in json.loads(r.stdout).items() if v})
    if r.stderr.strip():
        print(r.stderr.strip())
    print(f"fórmulas: {len(KATEX)} de {len(texts)} dibujadas con KaTeX")


def main():
    DATA.mkdir(exist_ok=True)
    render_all_latex()
    index, data_files = [], []
    for dom in DOMAINS:
        src = SRC / f"{dom['id']}.md"
        if not src.exists():
            index.append({**dom, "ready": False})
            continue
        qpath = QUIZ / f"{dom['id']}.json"
        quizzes = json.loads(qpath.read_text("utf-8")) if qpath.exists() else {}
        d = parse_domain(dom, src.read_text("utf-8"), quizzes)
        js = "window.CPP_DATA=window.CPP_DATA||{};window.CPP_DATA[%s]=%s;\n" % (
            json.dumps(dom["id"]), json.dumps(d, ensure_ascii=False, separators=(",", ":")))
        (DATA / f"{dom['id']}.js").write_text(js, "utf-8")
        data_files.append(f"data/{dom['id']}.js")
        chs = d["chapters"]
        en_src = SRC / "en" / f"{dom['id']}.md"
        has_en = en_src.exists()
        if has_en:
            en_sum = parse_en_summary(dom, en_src.read_text("utf-8"))
            missing = [c["id"] for c in chs if c["id"] not in en_sum]
            (DATA / "en").mkdir(exist_ok=True)
            (DATA / "en" / f"{dom['id']}.js").write_text(
                "window.CPP_EN=window.CPP_EN||{};window.CPP_EN[%s]=%s;\n" % (
                    json.dumps(dom["id"]), json.dumps(en_sum, ensure_ascii=False, separators=(",", ":"))), "utf-8")
            data_files.append(f"data/en/{dom['id']}.js")
            print(f"  resumen en inglés {dom['id']}: {len(chs) - len(missing)}/{len(chs)} capítulos"
                  + (f" (faltan {', '.join(missing)})" if missing else ""))
        index.append({**dom, "ready": True, "en": has_en, "chapters": len(chs),
                      "cards": sum(len(c["cards"]) for c in chs), "quiz": sum(len(c["quiz"]) for c in chs)})
        auto = sum(1 for c in chs for q in c["quiz"] if q.get("auto"))
        print(f"{dom['id']}: {len(chs)} capítulos/apéndices, {index[-1]['cards']} fichas, "
              f"{index[-1]['quiz']} preguntas de test ({auto} automáticas), "
              f"{sum(len(c['ojo']) for c in chs)} notas 'ojo', {len(js) // 1024} KB")

    src_dir = TOOLS / "i18n" / "src"
    src_dir.mkdir(parents=True, exist_ok=True)
    for dom_id, exp in EXPORT.items():
        (src_dir / f"{dom_id}.json").write_text(json.dumps(exp, ensure_ascii=False, indent=1), "utf-8")
        en = load_en(dom_id)
        print(f"  inglés {dom_id}: {sum(1 for k in exp['cards'] if k in en['cards'])}/{len(exp['cards'])} fichas, "
              f"{sum(1 for k in exp['quiz'] if k in en['quiz'])}/{len(exp['quiz'])} preguntas, "
              f"{sum(1 for k in exp['ideas'] if k in en['ideas'])}/{len(exp['ideas'])} ideas")

    (DATA / "index.js").write_text(
        "window.CPP_INDEX=%s;\n" % json.dumps(index, ensure_ascii=False, separators=(",", ":")), "utf-8")

    fonts = sorted(f"vendor/katex/fonts/{p.name}" for p in (ROOT / "vendor/katex/fonts").glob("*.woff2"))
    fonts += sorted(f"vendor/fonts/{p.name}" for p in (ROOT / "vendor/fonts").glob("*.woff2"))
    assets = ["./", "index.html", "styles.css", "config.js", "app.js", "assets.js", "manifest.webmanifest",
              "vendor/katex/katex.min.css", *fonts,
              "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png",
              "icons/icon-maskable-512.png", "data/index.js"] + data_files
    h = hashlib.sha256()
    for a in assets:
        if a not in ("./", "assets.js"):
            h.update((ROOT / a).read_bytes())
    version = h.hexdigest()[:10]
    (ROOT / "assets.js").write_text("self.CPP_VERSION=%s;\n" % json.dumps(version), "utf-8")
    sw = (TOOLS / "sw.template.js").read_text("utf-8")
    (ROOT / "sw.js").write_text(sw.replace("__VERSION__", version).replace("__ASSETS__", json.dumps(assets)), "utf-8")
    print("versión", version)


if __name__ == "__main__":
    main()
