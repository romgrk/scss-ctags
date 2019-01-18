
# scss-ctags

Ctags generator for SCSS. Slightly smarter than regex-matching generators.

### Supported tags

| Kind | Name |
|---|---|
| v | variable |
| m | mixin |
| f | function |
| r | rule |

Nests rules. The above example will generate the tags `.Button` (line 1) and `.Button &:hover` (line 2).

```scss
.Button {
  &:hover {
    color: pink;
  }
}
```

Variables are not nested for the moment, just exposed as is.
The above example will generate the tags `$size`, `.Button`, and `$color`.
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
