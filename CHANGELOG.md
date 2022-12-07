# Change Log

## 0.0.1

- init

## 0.0.2

- cleanup config
- support multi locales

## 0.0.3

- add a way to stop the extension from search big files

## 0.0.4

- better api

## 0.0.7

- go to key

## 0.0.8

- add config for methods to search for

## 0.0.9

- support json

## 0.1.0

- fix regresion in 0.0.9

## 0.1.1

- better jump to value
- fix for json that have `.` in key name

## 0.1.2

- increase the timeout a little bit to get a consistent jump to value
- make the cursor reveal at center
- better check for json

## 0.1.4

- fix not correctly highlighting mixed quotes
- offer to copy string if not found in file

## 0.1.5

- fix not correctly scrolling to keys with mixed quotes

## 0.1.6

- ignore adding links to dynamic values ex.`hello.$world`

## 0.1.7

- fix link leaking to incorrect quotes

## 0.1.8

- fix package settings name

## 0.2.0

- i recently started using [laravel-modules](https://nwidart.com/laravel-modules/v6/installation-and-setup) & manual navigation is just impossible, so now we have support to a custom internal & vendor paths 🎊 💃 🚀,

    make sure u r following the nameing convention of `Pascal > Snake` ex.
    + `module namespace` > `MyDashboard`
    + `view namespace` > `my_dashboard`
- also now the hover card will show the full file path from root instead of just its name
- oh & Merry Christmas 🎄

## 0.2.1

- we can now view the config key value with the help of `laravel/tinker`
- add new config `laravelGotoLang.waitB4Scroll` to freely customize the file search delay
- add new config `laravelGotoLang.showValueOnHover` to toggle value on hover on/off

## 0.2.2

- add cacheing, subsequent calls will load instantly, using `showValueOnHover` should be slightly quicker now

## 0.2.5

- fix range is undefined
- fix hl keys that ends with `.`

## 0.2.6

- fix wrong path seperator for windows

## 0.2.7

- remove `$base` from config as its redundant
- fix not hl dbl quotes keys

## 0.2.8

- fix a long running issue of https://github.com/microsoft/vscode/issues/113328

## 0.2.9

- make php dynamic

## 0.3.0

- use the correct file opening command

## 0.3.1

- make sure path separators are normalized

## 0.3.2

- make sure path separator are aligned with os

## 0.4.0

- fix link popup not being clickable
- use a cmnd instead of the uri handler
- remove tinker cmnd support and instead load the lang files data in memory, much quicker and loading happens only once project wide
- plz update ur `laravelGotoLang.phpCommand` to end with `php` only

## 0.4.5

- remove `waitB4Scroll`
- use symbol provider to correctly navigate to key
- update rdme
