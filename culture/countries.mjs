export const countries=[
 ['ID','🇮🇩','Endonezya','IDN','INDONESIA'],['BR','🇧🇷','Brezilya','BRA','BRAZIL'],['US','🇺🇸','ABD','USA','UNITED STATES'],['MX','🇲🇽','Meksika','MEX','MEXICO'],['VN','🇻🇳','Vietnam','VNM'],['PK','🇵🇰','Pakistan','PAK'],['PH','🇵🇭','Filipinler','PHL','PHILIPPINES'],['TH','🇹🇭','Tayland','THA','THAILAND'],['BD','🇧🇩','Bangladeş','BGD','BANGLADESH'],['NG','🇳🇬','Nijerya','NGA','NIGERIA'],['TR','🇹🇷','Türkiye','TUR','TURKEY','TURKIYE'],['JP','🇯🇵','Japonya','JPN','JAPAN'],['DE','🇩🇪','Almanya','DEU','GERMANY'],['FR','🇫🇷','Fransa','FRA','FRANCE'],['IT','🇮🇹','İtalya','ITA','ITALY'],['GB','🇬🇧','İngiltere','UK','GBR','ENGLAND','UNITED KINGDOM'],['CA','🇨🇦','Kanada','CAN','CANADA'],['ES','🇪🇸','İspanya','ESP','SPAIN'],['AR','🇦🇷','Arjantin','ARG','ARGENTINA'],['ZA','🇿🇦','Güney Afrika','ZAF','SOUTH AFRICA']
].map(([id,flag,name,...aliases],i)=>({id,flag,name,aliases:[id,name,...aliases],priority:i<10,image:`./assets/culture-v1/${id.toLowerCase()}.webp`}));
export const byId=Object.fromEntries(countries.map(c=>[c.id,c]));
const normalized=s=>String(s).replace(/ı/g,'i').normalize('NFKD').replace(/\p{M}/gu,'').toUpperCase().replace(/\s+/g,' ').trim();
export function countryOf(raw){
 const text=String(raw??'').trim();if(text.length>80)return null;
 const value=text.replace(/^(?:ülke|ulke|country|team)\s*[:=]\s*/iu,'').trim();
 for(const c of countries){if(value===c.flag)return c.id;for(const alias of c.aliases){if(normalized(value)!==normalized(alias))continue;return c.id;}}
 return null;
}
