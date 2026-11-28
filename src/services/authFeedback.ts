// Shared policy for new tenant passwords; existing credentials remain valid at login.
export const validNewPassword=(value:string)=>value.length>=12&&Boolean(value.trim())&&new TextEncoder().encode(value).length<=72;
export const newPasswordHint='Use pelo menos 12 caracteres, até 72 bytes, e uma senha exclusiva.';
export function authError(error:unknown,fallback:string){
 const e=error as {response?:{status?:number;data?:{message?:string|string[];error?:{message?:string}}}};
 const status=e.response?.status;
 const m=e.response?.data?.error?.message||e.response?.data?.message;
 if(status===429)return 'Muitas tentativas. Aguarde um minuto antes de tentar novamente.';
 if(!status)return 'Não foi possível conectar ao servidor. Confira a conexão e tente novamente.';
 return Array.isArray(m)?m.join(' · '):m||fallback;
}
