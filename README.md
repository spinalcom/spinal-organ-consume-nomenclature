# spinal-organ-consume-nomenclature

## Install

Use spinalcom-utils

```sh
spinalcom-utils i
```

## usage

copy the .env to .env.local and fill it

```sh
node index.js XLSX_FILE_PATH
```

## How it work

- read the xlxs
- convert it to json
- for each row
  - load the Spinalnode using the `Dynamic ID` attr
  - get the attributs from the SpinalNode corresponding for the sheet
  - set / create the attributs from the sheet to the SpinalNode

Some exceptions for the "empty" values in the sheet : ` ` (space), `-` or `null`

- if the attribut exist in the node but "empty" in the sheet, it will be set to `-`
- else if it doesn't exist in the node, they are skipped
