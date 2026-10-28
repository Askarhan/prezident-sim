# builds www/index.html from the game page (the same file that is published as the web prototype)
import sys, pathlib
src = pathlib.Path(sys.argv[1]).read_text(encoding='utf-8')
head = ('<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">\n'
        '<meta name="theme-color" content="#0A1120">\n')
out = pathlib.Path(__file__).resolve().parent.parent / 'www' / 'index.html'
out.write_text(head + src + '\n</html>\n', encoding='utf-8')
print('written', out, len(src)//1024, 'KB')
