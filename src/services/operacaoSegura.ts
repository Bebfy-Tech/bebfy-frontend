import axios from 'axios';
// Only clear a key when the API explicitly rejects the request. Network failures,
// conflicts and server failures can leave the operation outcome uncertain.
export function rejeicaoDefinitiva(error:unknown):boolean{
 return axios.isAxiosError(error)&&[400,403,404,422,429].includes(error.response?.status??0);
}
export function confirmarAbandonoOperacao(pendente:boolean):boolean{
 return !pendente||window.confirm('A operação pode ter sido registrada. Confira o histórico/extrato antes de iniciar outra. Deseja abandonar esta tentativa?');
}
