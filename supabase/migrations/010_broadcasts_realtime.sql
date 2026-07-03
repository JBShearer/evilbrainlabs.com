-- Enable realtime for broadcasts table
-- Migration: 010_broadcasts_realtime.sql

ALTER PUBLICATION supabase_realtime ADD TABLE broadcasts;
