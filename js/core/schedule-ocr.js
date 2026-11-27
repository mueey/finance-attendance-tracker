/**
 * On-device image text extraction where the experimental TextDetector API exists.
 * For local desktop installations, the optional Python + Tesseract helper offers
 * offline OCR through the SAME origin at /api/ocr. Hosted GitHub Pages cannot run it.
 * Never send a photo to a third-party cloud endpoint.
 */
export async function readSchedulePhoto(file){
 if(!file||!file.type.startsWith('image/'))throw Error('Choose an image file.');
 if(file.size>8*1024*1024)throw Error('Choose an image smaller than 8 MB.');
 const native=globalThis.TextDetector;
 if(typeof native==='function'){
  try{
   const bitmap=await createImageBitmap(file);
   try{
    const detected=await new native().detect(bitmap);
    const text=(detected||[]).map(x=>x.rawValue||'').filter(Boolean).join('\n');
    if(text.trim())return {text,engine:'On-device browser text recognition'};
   }finally{bitmap.close?.();}
  }catch(error){console.warn('Native OCR unavailable for this photo',error);}
 }
 if(['localhost','127.0.0.1','[::1]'].includes(location.hostname)){
  try{
   const data=await file.arrayBuffer();
   const response=await fetch('./api/ocr',{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream'},body:data});
   if(response.ok){const payload=await response.json();if(typeof payload.text==='string'&&payload.text.trim())return {text:payload.text,engine:'Local Tesseract OCR (offline)'};}
  }catch(error){console.warn('Local OCR helper not running',error);}
 }
 throw Error('Automatic OCR is not available in this browser/hosting setup. Use Copy Text (for example from your phone photo gallery) and paste it below, or run the optional local OCR helper on a computer. Your photo has not been sent to any external service.');
}
