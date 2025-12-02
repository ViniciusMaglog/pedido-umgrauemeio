'use client';

import { useState, ChangeEvent, FormEvent } from 'react';

// --- CONFIGURAÇÕES FIXAS PARA UM GRAU E MEIO / MALAF ---

// Cliente fixo: Um Grau e Meio
const CLIENT_ID = '8A697099-E130-4A57-BE47-DD8B72E3C003';
const CLIENT_NAME = 'Um Grau e Meio';

// Filiais fixas (MALAF)
const MALAF_FILIAIS = [
    { cnpj: '20230376000280', name: 'MALAF TRANSPORTES E LOGISTICA LTDA (Matriz/Filial)' },
];

// O CNPJ que será o padrão/pré-selecionado
const DEFAULT_CNPJ_FILIAL = MALAF_FILIAIS[0].cnpj;

// CONSTANTES DA API E TENANT
const TENANT = process.env.NEXT_PUBLIC_TENANT || 'F8A63EBF-A4C5-457D-9482-2D6381318B8E';
const API_POST_URL = 'https://api.maglog.com.br/api-wms/rest/1/event/expedicao';

// Texto fixo para observação de pedidos via integração
const FIXED_OBSERVATION = 'Maglog: pedido criado por Um Grau e Meio via integração.';

// --- INTERFACES ---
interface Destinatario {
    CNPJCPF: string;
    Nome: string;
    Logradouro: string;
    Numero: string;
    Complemento?: string;
    Bairro: string;
    Cidade: string;
    UF: string;
    CEP?: string;
}
interface Item {
    NrItem: string;
    Codigo: string;
    Valor: string;
    Unidade: string;
    Quantidade: string;
    ObsItem?: string;
}
interface Transportadora {
    CNPJ: string;
    Nome: string;
    Logradouro: string;
    Numero: string;
    Complemento?: string;
    Bairro: string;
    Cidade: string;
    UF: string;
    CEP?: string;
}
interface ExpedicaoBody {
    CNPJFilial: string;
    Documento: string;
    Emissao: string;
    Destinatario: Destinatario;
    Itens: Item[];
    Transportadora: Transportadora;
    ClienteRetira: boolean;
    Observacao?: string;
}

// --- ESTADO INICIAL MANUAL ---
const initialManualFormState: ExpedicaoBody = {
    CNPJFilial: DEFAULT_CNPJ_FILIAL, // MALAF
    Documento: '',
    Emissao: new Date().toISOString().split('T')[0],
    Destinatario: {
        CNPJCPF: '', Nome: '', Logradouro: '', Numero: '', Complemento: '',
        Bairro: '', Cidade: '', UF: '', CEP: ''
    },
    Itens: [{ NrItem: '1', Codigo: '', Valor: '0', Unidade: '', Quantidade: '1', ObsItem: '' }],
    Transportadora: {
        CNPJ: '', Nome: '', Logradouro: '', Numero: '', Complemento: '',
        Bairro: '', Cidade: '', UF: '', CEP: ''
    },
    ClienteRetira: false,
    Observacao: ''
};

// --- FUNÇÃO PRINCIPAL ---
export default function ExpedicaoPage() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [manualForm, setManualForm] = useState<ExpedicaoBody>(initialManualFormState);

    // Função para remover campos com valor 'undefined'
    function cleanUndefineds<T>(obj: T): T {
        if (Array.isArray(obj)) { return obj.map(cleanUndefineds) as unknown as T; }
        if (typeof obj === 'object' && obj !== null) {
            const newObj: Record<string, unknown> = {};
            for (const key in obj) {
                const value = (obj as Record<string, unknown>)[key];
                newObj[key] = value === undefined ? '' : cleanUndefineds(value);
            }
            return newObj as T;
        }
        return obj;
    }

    // --- LÓGICA PARA CADASTRO MANUAL ---
    const handleManualFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setManualForm(prev => ({
                ...prev,
                [parent]: {
                    ...(prev[parent as keyof ExpedicaoBody] as object),
                    [child]: value
                }
            }));
        } else {
            setManualForm(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }
    };

    const handleItemChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const updatedItens = [...manualForm.Itens];
        updatedItens[index] = { ...updatedItens[index], [name]: value };
        setManualForm(prev => ({ ...prev, Itens: updatedItens }));
    };

    const handleAddItem = () => {
        setManualForm(prev => ({
            ...prev,
            Itens: [...prev.Itens, {
                NrItem: (prev.Itens.length + 1).toString(), Codigo: '', Valor: '0', Unidade: '', Quantidade: '1', ObsItem: ''
            }]
        }));
    };

    const handleRemoveItem = (index: number) => {
        setManualForm(prev => ({
            ...prev,
            Itens: prev.Itens.filter((_, i) => i !== index).map((item, newIndex) => ({ ...item, NrItem: (newIndex + 1).toString() }))
        }));
    };

    const handleManualSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);

        const formPayload = JSON.parse(JSON.stringify(manualForm));

        // Lógica de concatenação da Observação
        if (formPayload.Observacao) {
            formPayload.Observacao = `${FIXED_OBSERVATION} | ${formPayload.Observacao}`;
        } else {
            formPayload.Observacao = FIXED_OBSERVATION;
        }

        // Tratar Transportadora vazia
        if (!formPayload.Transportadora.Nome && !formPayload.Transportadora.CNPJ) {
            formPayload.Transportadora = {
                CNPJ: '00000000000000', Nome: 'Cliente Retira', Logradouro: 'Cliente Retira', Numero: 'S/N',
                Bairro: 'Não informado', Cidade: '', UF: '', CEP: '00000000', Complemento: ''
            };
        }

        const cleanedForm = cleanUndefineds(formPayload);

        try {
            const resp = await fetch(API_POST_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Tenant: TENANT, Owner: CLIENT_ID },
                body: JSON.stringify(cleanedForm)
            });
            const data = await resp.json();

            if (!resp.ok) { throw new Error(data?.message || JSON.stringify(data)); }

            alert(`Pedido manual "${manualForm.Documento}" criado com sucesso para o cliente ${CLIENT_NAME}!`);
            setManualForm(initialManualFormState);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
            alert(`Erro ao criar pedido: ${errorMessage}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // --- RENDERIZAÇÃO DO FORMULÁRIO MANUAL ---
    const renderManualForm = () => (
        <form onSubmit={handleManualSubmit} className="form-card manual-form">
            <fieldset>
                <legend>Informações Gerais</legend>
                <div className="grid-2">
                    <div className="form-group">
                        <label>CNPJ Filial</label>
                        <select name="CNPJFilial" value={manualForm.CNPJFilial} onChange={handleManualFormChange} required className="input-padrao">
                            {MALAF_FILIAIS.map((filial) => (
                                <option key={filial.cnpj} value={filial.cnpj}>
                                    {filial.cnpj} | {filial.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Documento (Nº Pedido)</label>
                        <input type="text" name="Documento" value={manualForm.Documento} onChange={handleManualFormChange} required className="input-padrao" />
                    </div>
                    <div className="form-group">
                        <label>Data de Emissão (Fixo: Hoje)</label>
                        <input
                            type="date"
                            name="Emissao"
                            value={manualForm.Emissao.split('T')[0]}
                            required
                            className="input-padrao"
                            readOnly
                            style={{ backgroundColor: '#000000ff', cursor: 'not-allowed', }}
                        />
                    </div>
                </div>
            </fieldset>

            <fieldset>
                <legend>Destinatário</legend>
                <div className="grid-2">
                    <div className="form-group">
                        <label>CNPJ/CPF</label>
                        <input type="text" name="Destinatario.CNPJCPF" value={manualForm.Destinatario.CNPJCPF} onChange={handleManualFormChange} required className="input-padrao" />
                    </div>
                    <div className="form-group">
                        <label>Nome Completo</label>
                        <input type="text" name="Destinatario.Nome" value={manualForm.Destinatario.Nome} onChange={handleManualFormChange} required className="input-padrao" />
                    </div>
                </div>
                <div className="form-group">
                    <label>Logradouro (Rua, Av.)</label>
                    <input type="text" name="Destinatario.Logradouro" value={manualForm.Destinatario.Logradouro} onChange={handleManualFormChange} required className="input-padrao" />
                </div>
                <div className="grid-2">
                    <div className="form-group">
                        <label>Número</label>
                        <input type="text" name="Destinatario.Numero" value={manualForm.Destinatario.Numero} onChange={handleManualFormChange} required className="input-padrao" />
                    </div>
                    <div className="form-group">
                        <label>Complemento</label>
                        <input type="text" name="Destinatario.Complemento" value={manualForm.Destinatario.Complemento || ''} onChange={handleManualFormChange} className="input-padrao" />
                    </div>
                </div>
                <div className="grid-2">
                    <div className="form-group">
                        <label>Bairro</label>
                        <input type="text" name="Destinatario.Bairro" value={manualForm.Destinatario.Bairro} onChange={handleManualFormChange} required className="input-padrao" />
                    </div>
                    <div className="form-group">
                        <label>CEP</label>
                        <input type="text" name="Destinatario.CEP" value={manualForm.Destinatario.CEP || ''} onChange={handleManualFormChange} required className="input-padrao" />
                    </div>
                </div>
                <div className="grid-2">
                    <div className="form-group">
                        <label>Cidade</label>
                        <input type="text" name="Destinatario.Cidade" value={manualForm.Destinatario.Cidade} onChange={handleManualFormChange} required className="input-padrao" />
                    </div>
                    <div className="form-group">
                        <label>UF</label>
                        <input type="text" name="Destinatario.UF" value={manualForm.Destinatario.UF} onChange={handleManualFormChange} required maxLength={2} className="input-padrao" />
                    </div>
                </div>
            </fieldset>

            <fieldset>
                <legend>Itens do Pedido</legend>

                {manualForm.Itens.map((item, index) => (
                    <div key={index} className="item-row-fields">

                        <div className="form-group item-input-group">
                            <label>Código</label>
                            <input type="text" name="Codigo" value={item.Codigo} onChange={(e) => handleItemChange(index, e)} required className="input-padrao" />
                        </div>

                        <div className="form-group item-input-group">
                            <label>Qtd</label>
                            <input type="number" name="Quantidade" value={item.Quantidade} onChange={(e) => handleItemChange(index, e)} required className="input-padrao" />
                        </div>

                        <div className="form-group item-input-group">
                            <label>UN</label>
                            <input type="text" name="Unidade" value={item.Unidade} onChange={(e) => handleItemChange(index, e)} required className="input-padrao" />
                        </div>

                        <div className="form-group item-input-group">
                            <label>Valor Unit.</label>
                            <input type="number" name="Valor" value={item.Valor} onChange={(e) => handleItemChange(index, e)} required className="input-padrao" />
                        </div>

                        <div className="form-group item-action-group">
                            <label className="action-label">Remover</label>
                            <button type="button" onClick={() => handleRemoveItem(index)} className="remove-item-btn">X</button>
                        </div>

                    </div>
                ))}
                <button type="button" onClick={handleAddItem} className="add-item-btn">+ Adicionar Item</button>
            </fieldset>

            <fieldset>
                <legend>Transportadora (Opcional)</legend>
                <div className="grid-2">
                    <div className="form-group">
                        <label>CNPJ</label>
                        <input type="text" name="Transportadora.CNPJ" value={manualForm.Transportadora.CNPJ} onChange={handleManualFormChange} className="input-padrao" />
                    </div>
                    <div className="form-group">
                        <label>Nome</label>
                        <input type="text" name="Transportadora.Nome" value={manualForm.Transportadora.Nome} onChange={handleManualFormChange} className="input-padrao" />
                    </div>
                </div>
                <div className="form-group">
                    <label>Logradouro</label>
                    <input type="text" name="Transportadora.Logradouro" value={manualForm.Transportadora.Logradouro} onChange={handleManualFormChange} className="input-padrao" />
                </div>
                <div className="grid-2">
                    <div className="form-group">
                        <label>Cidade</label>
                        <input type="text" name="Transportadora.Cidade" value={manualForm.Transportadora.Cidade} onChange={handleManualFormChange} className="input-padrao" />
                    </div>
                    <div className="form-group">
                        <label>UF</label>
                        <input type="text" name="Transportadora.UF" value={manualForm.Transportadora.UF} onChange={handleManualFormChange} maxLength={2} className="input-padrao" />
                    </div>
                </div>
            </fieldset>

            {/* FIELDSET PARA OBSERVAÇÃO DO PEDIDO (CORRIGIDO) */}
            <fieldset>
                <legend>Observação do Pedido (Opcional)</legend>
                <div className="form-group">
                    <label>Observação</label>
                    <textarea name="Observacao" value={manualForm.Observacao || ''} onChange={handleManualFormChange} className="input-padrao" rows={3}></textarea>
                </div>
            </fieldset>

            <button type="submit" className="submit-btn" disabled={isProcessing}>
                {isProcessing ? 'Enviando...' : 'Criar Pedido'}
            </button>
        </form>
    );

    // --- RENDERIZAÇÃO PRINCIPAL ---
    return (
        <div className="container">
            <img src="/logo.png" alt={`Logo ${CLIENT_NAME}`} width="150" height="50" className="logo" onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/150x60/eee/ccc?text=Logo'; }} />
            <h1>Cadastro de Pedidos - {CLIENT_NAME}</h1>

            {renderManualForm()}
        </div>
    );
}