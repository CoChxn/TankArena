let s=+process.env.SEED||1;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
