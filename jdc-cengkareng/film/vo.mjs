// Generates one Kokoro voice-over file per scene and writes durations to audio/vo/vo.json.
import fs from "node:fs";import path from "node:path";import {execFileSync} from "node:child_process";
const dir=path.dirname(new URL(import.meta.url).pathname);const S=JSON.parse(fs.readFileSync(path.join(dir,"script.json"),"utf8"));
const out=path.join(dir,"audio","vo");fs.mkdirSync(out,{recursive:true});const hf=path.resolve(dir,"../../hyperframes");
const dur=f=>+execFileSync("ffprobe",["-v","error","-show_entries","format=duration","-of","csv=p=0",f]).toString().trim();
const only=process.argv.slice(2);const meta=fs.existsSync(path.join(out,"vo.json"))?JSON.parse(fs.readFileSync(path.join(out,"vo.json"),"utf8")):{};
for(const s of S.scenes){if(only.length&&!only.includes(s.id))continue;const raw=path.join(out,`${s.id}.raw.wav`),f=path.join(out,`${s.id}.wav`);
 execFileSync("npx",["--yes","hyperframes@0.8.217","tts",s.tts,"-v",S.voice,"-s",String(s.speed||S.speed),"-o",raw],{cwd:hf,stdio:["ignore","ignore","inherit"]});
 // trim leading/trailing silence, normalise to -16 LUFS
 execFileSync("ffmpeg",["-v","error","-y","-i",raw,"-af","silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-16:TP=-1.5:LRA=11","-ar","48000",f]);
 fs.rmSync(raw);meta[s.id]=+dur(f).toFixed(3);console.log(s.id,meta[s.id]+"s",s.vo)}
fs.writeFileSync(path.join(out,"vo.json"),JSON.stringify(meta,null,1));
