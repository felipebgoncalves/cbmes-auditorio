--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: auditorio_checklist; Type: TABLE; Schema: public; Owner: postgres
--

-- ================================
-- LIMPEZA DO SCHEMA
-- ================================
DROP TABLE IF EXISTS auditorio_checklist CASCADE;
DROP TABLE IF EXISTS auditorio_reserva CASCADE;
DROP TABLE IF EXISTS auditorio_usuario CASCADE;


CREATE TABLE public.auditorio_checklist (
    id integer NOT NULL,
    reserva_id integer NOT NULL,
    tipo character varying(10) NOT NULL,
    preenchido_em timestamp with time zone DEFAULT now() NOT NULL,
    concordou_uso boolean,
    houve_alteracoes boolean,
    confirmacao_raw text,
    respostas jsonb NOT NULL,
    CONSTRAINT auditorio_checklist_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['CHECKIN'::character varying, 'CHECKOUT'::character varying])::text[])))
);


ALTER TABLE public.auditorio_checklist OWNER TO postgres;

--
-- Name: auditorio_checklist_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.auditorio_checklist_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.auditorio_checklist_id_seq OWNER TO postgres;

--
-- Name: auditorio_checklist_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.auditorio_checklist_id_seq OWNED BY public.auditorio_checklist.id;


--
-- Name: auditorio_reserva; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auditorio_reserva (
    id integer NOT NULL,
    data_evento date NOT NULL,
    periodo character varying(20) NOT NULL,
    instituicao character varying(150) NOT NULL,
    responsavel character varying(150) NOT NULL,
    email character varying(150) NOT NULL,
    telefone character varying(40) NOT NULL,
    finalidade character varying(80) NOT NULL,
    observacoes text,
    status character varying(20) DEFAULT 'PENDENTE'::character varying NOT NULL,
    analisado_por character varying(150),
    motivo_decisao text,
    data_decisao timestamp without time zone,
    criado_em timestamp without time zone DEFAULT now() NOT NULL,
    anexo_url text,
    tipo_solicitacao character varying(20) DEFAULT 'EXTERNA'::character varying NOT NULL,
    data_fim date,
    analisado_email character varying(120),
    checklist_token uuid,
    checklist_preenchido_em timestamp with time zone,
    checklist_respostas jsonb,
    checklist_checkout_preenchido_em timestamp with time zone,
    checkout_com_alteracoes boolean DEFAULT false,
    CONSTRAINT chk_data_intervalo CHECK (((data_fim IS NULL) OR (data_fim >= data_evento))),
    CONSTRAINT chk_status_reserva CHECK (((status)::text = ANY ((ARRAY['PENDENTE'::character varying, 'APROVADA'::character varying, 'NEGADA'::character varying, 'CANCELADA'::character varying])::text[]))),
    CONSTRAINT chk_tipo_solicitacao CHECK (((tipo_solicitacao)::text = ANY ((ARRAY['INTERNA'::character varying, 'EXTERNA'::character varying])::text[])))
);


ALTER TABLE public.auditorio_reserva OWNER TO postgres;

--
-- Name: auditorio_reserva_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.auditorio_reserva_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.auditorio_reserva_id_seq OWNER TO postgres;

--
-- Name: auditorio_reserva_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.auditorio_reserva_id_seq OWNED BY public.auditorio_reserva.id;


--
-- Name: auditorio_usuario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auditorio_usuario (
    id integer NOT NULL,
    nome character varying(100) NOT NULL,
    email_login character varying(120) NOT NULL,
    senha_hash character varying(200) NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    reset_token character varying(100),
    reset_expira_em timestamp without time zone,
    is_admin boolean DEFAULT false NOT NULL,
    tipo_escopo character varying(10) DEFAULT 'AMBOS'::character varying NOT NULL
);


ALTER TABLE public.auditorio_usuario OWNER TO postgres;

--
-- Name: auditorio_usuario_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.auditorio_usuario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.auditorio_usuario_id_seq OWNER TO postgres;

--
-- Name: auditorio_usuario_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.auditorio_usuario_id_seq OWNED BY public.auditorio_usuario.id;


--
-- Name: auditorio_checklist id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditorio_checklist ALTER COLUMN id SET DEFAULT nextval('public.auditorio_checklist_id_seq'::regclass);


--
-- Name: auditorio_reserva id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditorio_reserva ALTER COLUMN id SET DEFAULT nextval('public.auditorio_reserva_id_seq'::regclass);


--
-- Name: auditorio_usuario id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditorio_usuario ALTER COLUMN id SET DEFAULT nextval('public.auditorio_usuario_id_seq'::regclass);


--
-- Name: auditorio_checklist auditorio_checklist_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditorio_checklist
    ADD CONSTRAINT auditorio_checklist_pkey PRIMARY KEY (id);


--
-- Name: auditorio_reserva auditorio_reserva_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditorio_reserva
    ADD CONSTRAINT auditorio_reserva_pkey PRIMARY KEY (id);


--
-- Name: auditorio_usuario auditorio_usuario_email_login_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditorio_usuario
    ADD CONSTRAINT auditorio_usuario_email_login_key UNIQUE (email_login);


--
-- Name: auditorio_usuario auditorio_usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditorio_usuario
    ADD CONSTRAINT auditorio_usuario_pkey PRIMARY KEY (id);


--
-- Name: ux_auditorio_reserva_checklist_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ux_auditorio_reserva_checklist_token ON public.auditorio_reserva USING btree (checklist_token) WHERE (checklist_token IS NOT NULL);


--
-- Name: ux_auditorio_reserva_data_periodo_ativa; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ux_auditorio_reserva_data_periodo_ativa ON public.auditorio_reserva USING btree (data_evento, periodo) WHERE ((status)::text = ANY ((ARRAY['PENDENTE'::character varying, 'APROVADA'::character varying])::text[]));


--
-- Name: auditorio_checklist auditorio_checklist_reserva_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auditorio_checklist
    ADD CONSTRAINT auditorio_checklist_reserva_id_fkey FOREIGN KEY (reserva_id) REFERENCES public.auditorio_reserva(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

