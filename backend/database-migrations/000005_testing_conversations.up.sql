INSERT INTO conversation (id, type) VALUES (1, 'direct');
INSERT INTO conversation (id, type) VALUES (2, 'direct');
INSERT INTO conversation (id, type) VALUES (3, 'direct');
INSERT INTO conversation (id, type) VALUES (4, 'direct');

INSERT INTO conversation_participant (user, conversation) VALUES (2, 1);
INSERT INTO conversation_participant (user, conversation) VALUES (1, 1);

INSERT INTO conversation_participant (user, conversation) VALUES (2, 2);
INSERT INTO conversation_participant (user, conversation) VALUES (3, 2);

INSERT INTO conversation_participant (user, conversation) VALUES (2, 3);
INSERT INTO conversation_participant (user, conversation) VALUES (4, 3);

INSERT INTO conversation_participant (user, conversation) VALUES (2, 4);
INSERT INTO conversation_participant (user, conversation) VALUES (5, 4);

INSERT INTO message (conversation, sender, content) VALUES (1, 1, 'Hey, how are you?');
INSERT INTO message (conversation, sender, content) VALUES (1, 2, 'Doing great, thanks! Just working on that new feature.');
INSERT INTO message (conversation, sender, content) VALUES (1, 1, 'Awesome! Let me know if you need any help.');

INSERT INTO message (conversation, sender, content) VALUES (2, 2, 'Did you see the latest design mockups?');
INSERT INTO message (conversation, sender, content) VALUES (2, 3, 'Not yet, I''ll check them out now. Are they in the shared folder?');
INSERT INTO message (conversation, sender, content) VALUES (2, 2, 'Yep!');