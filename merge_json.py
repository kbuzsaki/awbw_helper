#!/usr/bin/env python3

from collections import OrderedDict
import json
import sys

def merge(lhs, rhs):
    # TODO: make this smarter?
    lhs.update(rhs)
    return lhs

if __name__ == "__main__":
    merged = OrderedDict()
    for fn in sys.argv[1:]:
        with open(fn) as f:
            merged = merge(merged, json.load(f, object_pairs_hook=OrderedDict))
    json.dump(merged, sys.stdout, indent=4)

