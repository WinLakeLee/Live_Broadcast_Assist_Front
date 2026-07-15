"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search } from "lucide-react";
import { PaymentStatus } from "@/components/payment/payment-status";
import { getOrderStatus } from "@/lib/api/orders";
import type { OrderStatusData } from "@/lib/api/contracts";
import { ApiError } from "@/lib/api/errors";
import { clearOrder } from "@/lib/secure-session";
const schema=z.object({reference:z.string().trim().min(1,"주문번호를 입력해 주세요."),token:z.string().trim().min(1,"조회키를 입력해 주세요.")});type Form=z.infer<typeof schema>;
export function OrderLookupClient(){const[data,setData]=useState<OrderStatusData>();const[message,setMessage]=useState("");const[busy,setBusy]=useState(false);const form=useForm<Form>({resolver:zodResolver(schema),defaultValues:{reference:"",token:""}});const submit=form.handleSubmit(async values=>{if(busy)return;setBusy(true);setMessage("");setData(undefined);try{setData(await getOrderStatus(values.reference,values.token));clearOrder()}catch(e){const api=e instanceof ApiError?e:null;setMessage(api?.retryAfter?`${api.message} ${api.retryAfter}초 후 다시 시도해 주세요.`:api?.message??"주문 정보를 확인하지 못했습니다.")}finally{setBusy(false)}});return <><form className="card" onSubmit={submit}><h2>보관한 정보를 입력하세요</h2><p className="muted">주문번호와 비밀 조회키는 서버 확인에만 사용되며 이 기기에 영구 저장하지 않습니다.</p><div className="lookup-grid"><div className="field"><label htmlFor="reference">주문번호</label><input id="reference" autoComplete="off" {...form.register("reference")}/>{form.formState.errors.reference&&<p className="error-text">{form.formState.errors.reference.message}</p>}</div><div className="field"><label htmlFor="token">비밀 조회키</label><input id="token" type="password" autoComplete="off" {...form.register("token")}/>{form.formState.errors.token&&<p className="error-text">{form.formState.errors.token.message}</p>}</div></div>{message&&<div className="notice error" role="alert">{message}</div>}<button className="button primary" disabled={busy}><Search size={18}/>{busy?"확인 중…":"주문 상태 확인"}</button></form>{data&&<PaymentStatus data={data}/>}</>}
