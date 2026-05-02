const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace('ArrowRight, } from "lucide-react";', 'from "lucide-react";'); // undo
content = content.replace('} from "lucide-react";', '  ArrowRight,\n} from "lucide-react";'); // redo properly
fs.writeFileSync('src/App.tsx', content);
