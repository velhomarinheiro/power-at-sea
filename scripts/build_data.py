"""Build the dashboard data files from the Power at Sea v2.0 Stata dataset.

Usage:  python3 scripts/build_data.py [path/to/world-atlas/countries-110m.json]

Outputs
  assets/js/data.js   -> window.PAS = {...}  (compact, column-oriented)
  data/poweratsea_v2.csv
  assets/js/world.js  -> window.PAS_WORLD = <topojson>  (only if a topojson path is given)
"""
import json
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "source" / "poweratsea_v2_data_1865-2025.dta"

# cowcode -> (ISO 3166 numeric polygons, map marker [lon, lat] or None, EN, PT, ES)
# Historical states are drawn on the polygons of their modern successors.
COUNTRIES = {
    2: (["840"], None, "United States", "Estados Unidos", "Estados Unidos"),
    20: (["124"], None, "Canada", "Canadá", "Canadá"),
    40: (["192"], None, "Cuba", "Cuba", "Cuba"),
    42: (["214"], None, "Dominican Republic", "República Dominicana", "República Dominicana"),
    70: (["484"], None, "Mexico", "México", "México"),
    100: (["170"], None, "Colombia", "Colômbia", "Colombia"),
    101: (["862"], None, "Venezuela", "Venezuela", "Venezuela"),
    130: (["218"], None, "Ecuador", "Equador", "Ecuador"),
    135: (["604"], None, "Peru", "Peru", "Perú"),
    140: (["076"], None, "Brazil", "Brasil", "Brasil"),
    155: (["152"], None, "Chile", "Chile", "Chile"),
    160: (["032"], None, "Argentina", "Argentina", "Argentina"),
    165: (["858"], None, "Uruguay", "Uruguai", "Uruguay"),
    200: (["826"], None, "United Kingdom", "Reino Unido", "Reino Unido"),
    210: (["528"], None, "Netherlands", "Países Baixos", "Países Bajos"),
    211: (["056"], None, "Belgium", "Bélgica", "Bélgica"),
    220: (["250"], None, "France", "França", "Francia"),
    230: (["724"], None, "Spain", "Espanha", "España"),
    235: (["620"], None, "Portugal", "Portugal", "Portugal"),
    255: (["276"], None, "Germany", "Alemanha", "Alemania"),
    260: (["276"], None, "West Germany", "Alemanha Ocidental", "Alemania Occidental"),
    265: ([], [12.6, 52.6], "East Germany", "Alemanha Oriental", "Alemania Oriental"),
    290: (["616"], None, "Poland", "Polônia", "Polonia"),
    300: (["040", "348", "191", "705", "070", "203", "703"], None, "Austria-Hungary", "Áustria-Hungria", "Austria-Hungría"),
    325: (["380"], None, "Italy", "Itália", "Italia"),
    339: (["008"], None, "Albania", "Albânia", "Albania"),
    345: (["688", "191", "705", "070", "807", "499"], None, "Yugoslavia", "Iugoslávia", "Yugoslavia"),
    350: (["300"], None, "Greece", "Grécia", "Grecia"),
    355: (["100"], None, "Bulgaria", "Bulgária", "Bulgaria"),
    360: (["642"], None, "Romania", "Romênia", "Rumania"),
    365: (["643"], None, "Russia / USSR", "Rússia / URSS", "Rusia / URSS"),
    366: (["233"], None, "Estonia", "Estônia", "Estonia"),
    367: (["428"], None, "Latvia", "Letônia", "Letonia"),
    368: (["440"], None, "Lithuania", "Lituânia", "Lituania"),
    369: (["804"], None, "Ukraine", "Ucrânia", "Ucrania"),
    372: (["268"], None, "Georgia", "Geórgia", "Georgia"),
    373: (["031"], None, "Azerbaijan", "Azerbaijão", "Azerbaiyán"),
    375: (["246"], None, "Finland", "Finlândia", "Finlandia"),
    380: (["752"], None, "Sweden", "Suécia", "Suecia"),
    385: (["578"], None, "Norway", "Noruega", "Noruega"),
    390: (["208"], None, "Denmark", "Dinamarca", "Dinamarca"),
    437: (["384"], None, "Côte d'Ivoire", "Costa do Marfim", "Costa de Marfil"),
    475: (["566"], None, "Nigeria", "Nigéria", "Nigeria"),
    481: (["266"], None, "Gabon", "Gabão", "Gabón"),
    531: (["232"], None, "Eritrea", "Eritreia", "Eritrea"),
    560: (["710"], None, "South Africa", "África do Sul", "Sudáfrica"),
    600: (["504"], None, "Morocco", "Marrocos", "Marruecos"),
    615: (["012"], None, "Algeria", "Argélia", "Argelia"),
    620: (["434"], None, "Libya", "Líbia", "Libia"),
    630: (["364"], None, "Iran", "Irã", "Irán"),
    640: (["792"], None, "Turkey (Ottoman Empire)", "Turquia (Império Otomano)", "Turquía (Imperio Otomano)"),
    645: (["368"], None, "Iraq", "Iraque", "Irak"),
    651: (["818"], None, "Egypt", "Egito", "Egipto"),
    652: (["760"], None, "Syria", "Síria", "Siria"),
    666: (["376"], None, "Israel", "Israel", "Israel"),
    670: (["682"], None, "Saudi Arabia", "Arábia Saudita", "Arabia Saudita"),
    680: (["887"], None, "Yemen", "Iêmen", "Yemen"),
    692: ([], [50.55, 26.07], "Bahrain", "Bahrein", "Baréin"),
    694: (["634"], None, "Qatar", "Catar", "Catar"),
    696: (["784"], None, "United Arab Emirates", "Emirados Árabes Unidos", "Emiratos Árabes Unidos"),
    698: (["512"], None, "Oman", "Omã", "Omán"),
    710: (["156"], None, "China", "China", "China"),
    713: (["158"], None, "Taiwan", "Taiwan", "Taiwán"),
    731: (["408"], None, "North Korea", "Coreia do Norte", "Corea del Norte"),
    732: (["410"], None, "South Korea", "Coreia do Sul", "Corea del Sur"),
    740: (["392"], None, "Japan", "Japão", "Japón"),
    750: (["356"], None, "India", "Índia", "India"),
    770: (["586"], None, "Pakistan", "Paquistão", "Pakistán"),
    771: (["050"], None, "Bangladesh", "Bangladesh", "Bangladés"),
    775: (["104"], None, "Myanmar", "Mianmar", "Myanmar"),
    780: (["144"], None, "Sri Lanka", "Sri Lanka", "Sri Lanka"),
    800: (["764"], None, "Thailand (Siam)", "Tailândia (Sião)", "Tailandia (Siam)"),
    816: (["704"], None, "Vietnam", "Vietnã", "Vietnam"),
    817: ([], [106.6, 10.8], "South Vietnam", "Vietnã do Sul", "Vietnam del Sur"),
    820: (["458"], None, "Malaysia", "Malásia", "Malasia"),
    830: ([], [103.82, 1.35], "Singapore", "Singapura", "Singapur"),
    840: (["608"], None, "Philippines", "Filipinas", "Filipinas"),
    850: (["360"], None, "Indonesia", "Indonésia", "Indonesia"),
    900: (["036"], None, "Australia", "Austrália", "Australia"),
    920: (["554"], None, "New Zealand", "Nova Zelândia", "Nueva Zelanda"),
}

REGIONS = {"Europe": 1, "Middle East": 2, "Africa": 3, "Asia": 4, "Americas": 5}

# Columns kept for the dashboard (missing values are zeroes, per the READ_ME).
FIELDS = [
    "base_ton", "amp_tonFULL", "assault_ton", "base_assault_ton", "grandtotal_ton",
    "ballsub_ton", "BaseShips", "AmpShips", "grandtotal_count", "bigship10k",
    "bigship7500", "bigship5k", "AircraftCarriers", "Battleships", "NukeAttSubs",
    "DieselSubs", "BallisticSubs", "assault_ships", "maj_logistic",
    "bigships10k_amph", "bigships10k_grandtotal", "navy_strength",
]


def main():
    df = pd.read_stata(SRC)
    df["cowcode"] = df["cowcode"].astype(int)
    missing = sorted(set(df.cowcode) - set(COUNTRIES))
    if missing:
        sys.exit(f"cowcodes without a name: {missing}")
    df[FIELDS] = df[FIELDS].fillna(0)
    df["region"] = df["region"].astype(str).map(REGIONS)
    df = df.sort_values(["cowcode", "year"])

    countries = []
    for cow, g in df.groupby("cowcode"):
        iso, marker, en, pt, es = COUNTRIES[cow]
        years = g.year.tolist()
        rec = {
            "cow": cow,
            "reg": int(g.region.iloc[0]),
            "n": {"en": en, "pt": pt, "es": es},
            "iso": iso,
            "y": years,
            "v": {},
        }
        if marker:
            rec["mk"] = marker
        for f in FIELDS:
            vals = g[f].tolist()
            if f == "navy_strength":
                rec["v"][f] = [float(f"{x:.4g}") for x in vals]
            else:
                rec["v"][f] = [int(round(x)) for x in vals]
        countries.append(rec)

    out = {
        "source": "Crisher, B. B. & Souva, M. Power at Sea dataset, version 2.0 (1865-2025)",
        "years": [int(df.year.min()), int(df.year.max())],
        "fields": FIELDS,
        "countries": countries,
    }
    js = "window.PAS=" + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n"
    (ROOT / "assets" / "js" / "data.js").write_text(js, encoding="utf-8")

    csv = df.copy()
    csv["country_en"] = csv.cowcode.map(lambda c: COUNTRIES[c][2])
    csv["tonnage_total_ssbn"] = csv.grandtotal_ton + csv.ballsub_ton
    inv = {v: k for k, v in REGIONS.items()}
    csv["region"] = csv.region.map(inv)
    cols = ["cowcode", "country_en", "region", "year", "tonnage_total_ssbn"] + FIELDS
    csv[cols].to_csv(ROOT / "data" / "poweratsea_v2.csv", index=False)

    if len(sys.argv) > 1:
        topo = json.loads(Path(sys.argv[1]).read_text())
        topo["objects"] = {"countries": topo["objects"]["countries"]}
        for g in topo["objects"]["countries"]["geometries"]:
            g["properties"] = {}
        (ROOT / "assets" / "js" / "world.js").write_text(
            "window.PAS_WORLD=" + json.dumps(topo, separators=(",", ":")) + ";\n")

    print(f"{len(countries)} navies, {len(df)} country-years -> assets/js/data.js")


if __name__ == "__main__":
    main()
