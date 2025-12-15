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

--
-- Data for Name: auditorio_usuario; Type: TABLE DATA; Schema: public; Owner: postgres
--

SET SESSION AUTHORIZATION DEFAULT;

ALTER TABLE public.auditorio_usuario DISABLE TRIGGER ALL;

INSERT INTO public.auditorio_usuario (id, nome, email_login, senha_hash, ativo, reset_token, reset_expira_em, is_admin, tipo_escopo) VALUES (1, 'Administrador CBMES', 'mierciomg@gmail.com', '$2b$10$14hS93x0QggpzN8p1NHxSudZ6FJmevXex/TM9SsW8kEefUYIEvsmC', true, NULL, NULL, true, 'AMBOS');
INSERT INTO public.auditorio_usuario (id, nome, email_login, senha_hash, ativo, reset_token, reset_expira_em, is_admin, tipo_escopo) VALUES (4, 'Teste de Cadastro', 'mgisele2008@gmail.com', '$2b$10$voT/q1mDaprA5658.cAru.WFNjrFFTjMzI6hxaMy5oKg8Nbw1r9ui', true, NULL, NULL, false, 'EXTERNA');


ALTER TABLE public.auditorio_usuario ENABLE TRIGGER ALL;

--
-- Name: auditorio_usuario_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.auditorio_usuario_id_seq', 4, true);


--
-- PostgreSQL database dump complete
--

