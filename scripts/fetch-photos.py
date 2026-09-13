"""Search Wikimedia Commons for CC-licensed Yosemite photos and print candidates."""
import json
import urllib.parse
import urllib.request

SUBJECTS = ["Half Dome Yosemite", "Bridalveil Fall Yosemite", "El Capitan Yosemite"]
API = "https://commons.wikimedia.org/w/api.php"


def api(params):
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "yosemite-scene/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


for subject in SUBJECTS:
    print("=" * 20, subject)
    d = api({
        "action": "query", "format": "json",
        "generator": "search", "gsrsearch": subject + " filetype:bitmap",
        "gsrnamespace": 6, "gsrlimit": 20,
        "prop": "imageinfo", "iiprop": "url|size|extmetadata",
        "iiurlwidth": 1920,
    })
    pages = d.get("query", {}).get("pages", {}).values()
    cands = []
    for p in pages:
        ii = (p.get("imageinfo") or [{}])[0]
        if ii.get("width", 0) >= 2500:
            meta = ii.get("extmetadata", {})
            cands.append({
                "title": p.get("title", ""),
                "w": ii.get("width"), "h": ii.get("height"),
                "thumb": ii.get("thumburl", ""),
                "artist": (meta.get("Artist", {}).get("value", "") or "")[:60],
                "license": meta.get("LicenseShortName", {}).get("value", ""),
            })
    for c in cands[:8]:
        print("-", c["title"], c["w"], "x", c["h"], "|", c["license"], "|", c["artist"])
