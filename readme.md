
# scss-ctags

Ctags generator for SCSS. Slightly smarter than regex-matching generators.

Usage:
```
$ scss-ctags --help
Usage: scss-ctags [options] <files ...>

Options:
  -V, --version            output the version number
  -f <file>                Tagfile ("-" for stdout)
  -R, --recurse            Search in sub-directories
  -a, --absolute           Use absolute paths
  -k, --keepAll            By default, add *.scss to the exclude patterns. This prevents that.
      --exclude [pattern]  A repeatable value (default: ["*.min.js","*.min.css","*.map",".sass-cache","node_modules","build",".git"])
  -h, --help               output usage information
```

### Supported tags

| Kind | Name |
|---|---|
| v | variable |
| m | mixin |
| f | function |
| r | rule |

Nests rules. The example below will generate the tags `.Button` (line 1) and `.Button &:hover` (line 2).

```scss
.Button {
  &:hover {
    color: pink;
  }
}
```

Variables are not nested for the moment, just exposed as is.
The example below will generate the tags `$size`, `.Button`, and `$color`.
```scss
$size: 1em;
.Button {
  $color: pink;
}
```

### Future developments

We may wish to generate tags for dynamically created rules (as below).

```scss
$columns: 12;

@for $i from 1 through $columns {
  .col-#{$i}-m { color: pink; }
}
```
