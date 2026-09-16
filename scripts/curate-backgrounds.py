"""Search Commons for dramatic Yosemite background candidates."""
import json
import urllib.parse
import urllib.request

SEARCHES = [
    "Yosemite Valley storm clouds",
    "Yosemite Tunnel View sunset",
    "Half Dome alpenglow",
    "Yosemite Valley winter snow",
    "El Capitan sunset light",
]
API = "https://commons.wikimedia.org/w/api.php"


def api(params):
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "yosemite-scene/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


for subject in SEARCHES:
    print("=" * 20, subject)
    d = api({
        "action": "query", "format": "json",
        "generator": "search", "gsrsearch": subject + " filetype:bitmap",
        "gsrnamespace": 6, "gsrlimit": 15,
        "prop": "imageinfo", "iiprop": "url|size|extmetadata",
        "iiurlwidth": 1920,
    })
    pages = d.get("query", {}).get("pages", {}).values()
    n = 0
    for p in pages:
        ii = (p.get("imageinfo") or [{}])[0]
        w, h = ii.get("width", 0), ii.get("height", 0)
        if w >= 2500 and h > 0 and w / h >= 1.2:
            meta = ii.get("extmetadata", {})
            print("-", p.get("title", ""), w, "x", h, "|",
                  meta.get("LicenseShortName", {}).get("value", ""))
            n += 1
            if n >= 6:
                break
